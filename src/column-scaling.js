'use strict';

var columnSizing = 'ko-grid-column-sizing';
var viewStateStorage = 'ko-grid-view-state-storage';
var columnResizing = 'ko-grid-column-resizing';

define(['module', 'knockout', 'onefold-js', 'ko-grid', columnSizing, viewStateStorage], function (module, ko, js, koGrid) {
    var extensionId = module.id.indexOf('/') < 0 ? module.id : module.id.substring(0, module.id.indexOf('/'));

    koGrid.defineExtension(extensionId, {
        dependencies: [viewStateStorage, columnSizing],
        Constructor: function ColumnScalingExtension(bindingValue, config, grid) {
            var borrowedPixels = ko.observable({});

            grid.extensions[viewStateStorage].modeDependent.bind('borrowedPixels', borrowedPixels);

            var isResizable = grid.extensions[columnSizing].isResizable;
            var isSameWidthAsPreviously = column => {
                var entry = borrowedPixels()[column.id];
                return entry && entry.width + entry.borrowed === column.widthInPixels();
            };

            grid.layout.beforeRelayout(function () {
                if (grid.extensions[columnResizing] && grid.extensions[columnResizing].isResizeInProgress())
                    return;

                var gridWidth = this.querySelector('.ko-grid-table-scroller').clientWidth;
                var combinedColumnWidth = grid.columns.combinedWidth();

                var returnablePixels = 0;
                grid.columns.displayed().forEach(c => {
                    returnablePixels += isSameWidthAsPreviously(c) ? borrowedPixels()[c.id].borrowed : 0;
                });

                if (gridWidth > combinedColumnWidth || gridWidth < combinedColumnWidth && returnablePixels)
                    redistributeExtraPixels(gridWidth);
            });

            var redistributeExtraPixels = gridWidth => {
                var newDistribution = determineAppropriateDistributionOfExtraPixels(gridWidth);

                js.objects.forEachProperty(newDistribution, (columnId, value) => {
                    var column = grid.columns.byId(columnId);
                    column.width((value.width + value.borrowed) + 'px');
                });

                borrowedPixels(newDistribution);
            };

            var determineAppropriateDistributionOfExtraPixels = gridWidth => {
                var displayedColumns = grid.columns.displayed();

                var baseCombinedColumnWidthOfAll = 0;
                var baseCombinedColumnWidthOfUnchanged = 0;
                var nonScalingWidth = 0;
                var baseDistribution = {};
                displayedColumns.forEach(c => {
                    var resizable = isResizable(c);

                    var w;
                    if (resizable && isSameWidthAsPreviously(c)) {
                        w = borrowedPixels()[c.id].width;
                        baseCombinedColumnWidthOfUnchanged += w;
                    } else {
                        w = c.widthInPixels();
                        nonScalingWidth += resizable ? 0 : w;
                    }

                    baseCombinedColumnWidthOfAll += w;
                    baseDistribution[c.id] = {
                        width: w,
                        borrowed: 0
                    };
                });

                var baseCombinedColumnWidth = baseCombinedColumnWidthOfUnchanged || baseCombinedColumnWidthOfAll - nonScalingWidth;
                if (baseCombinedColumnWidthOfAll >= gridWidth)
                    return baseDistribution;

                var remainingSparePixels = gridWidth - baseCombinedColumnWidthOfAll;
                var scale = baseCombinedColumnWidth;

                return js.objects.mapProperties(baseDistribution, (value, columnId) => {
                    var column = grid.columns.byId(columnId);
                    if (!isResizable(column) || baseCombinedColumnWidthOfUnchanged && !isSameWidthAsPreviously(column))
                        return value;

                    var share = Math.round((value.width / scale) * remainingSparePixels);
                    remainingSparePixels -= share;
                    scale -= value.width;

                    return {
                        width: value.width,
                        borrowed: share
                    };
                });
            };
        }
    });

    return koGrid.declareExtensionAlias('columnScaling', extensionId);
});
