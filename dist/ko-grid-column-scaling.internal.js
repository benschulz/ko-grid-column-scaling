/*
 * Copyright (c) 2015, Ben Schulz
 * License: BSD 3-clause (http://opensource.org/licenses/BSD-3-Clause)
 */
define(['stringifyable', 'onefold-dom', 'indexed-list', 'onefold-lists', 'onefold-js', 'ko-grid-column-resizing', 'ko-grid-view-state-storage', 'ko-data-source', 'ko-indexed-repeat', 'ko-grid-column-sizing', 'ko-grid-view-modes', 'knockout', 'ko-grid'],    function(stringifyable, onefold_dom, indexed_list, onefold_lists, onefold_js, ko_grid_column_resizing, ko_grid_view_state_storage, ko_data_source, ko_indexed_repeat, ko_grid_column_sizing, ko_grid_view_modes, knockout, ko_grid) {
var ko_grid_column_scaling_column_scaling, ko_grid_column_scaling;

var columnSizing = 'ko-grid-column-sizing';
var viewStateStorage = 'ko-grid-view-state-storage';
var columnResizing = 'ko-grid-column-resizing';
ko_grid_column_scaling_column_scaling = function (module, ko, js, koGrid) {
  var extensionId = 'ko-grid-column-scaling'.indexOf('/') < 0 ? 'ko-grid-column-scaling' : 'ko-grid-column-scaling'.substring(0, 'ko-grid-column-scaling'.indexOf('/'));
  koGrid.defineExtension(extensionId, {
    dependencies: [
      viewStateStorage,
      columnSizing
    ],
    Constructor: function ColumnScalingExtension(bindingValue, config, grid) {
      var borrowedPixels = ko.observable({});
      grid.extensions[viewStateStorage].modeDependent.bind('borrowedPixels', borrowedPixels);
      var isResizable = grid.extensions[columnSizing].isResizable;
      var isSameWidthAsPreviously = function (column) {
        var entry = borrowedPixels()[column.id];
        return entry && entry.width + entry.borrowed === column.widthInPixels();
      };
      grid.layout.beforeRelayout(function () {
        if (grid.extensions[columnResizing] && grid.extensions[columnResizing].isResizeInProgress())
          return;
        var gridWidth = this.querySelector('.ko-grid-table-scroller').clientWidth;
        var combinedColumnWidth = grid.columns.combinedWidth();
        var returnablePixels = 0;
        grid.columns.displayed().forEach(function (c) {
          returnablePixels += isSameWidthAsPreviously(c) ? borrowedPixels()[c.id].borrowed : 0;
        });
        if (gridWidth > combinedColumnWidth || gridWidth < combinedColumnWidth && returnablePixels)
          redistributeExtraPixels(gridWidth);
      });
      var redistributeExtraPixels = function (gridWidth) {
        var newDistribution = determineAppropriateDistributionOfExtraPixels(gridWidth);
        js.objects.forEachProperty(newDistribution, function (columnId, value) {
          var column = grid.columns.byId(columnId);
          column.width(value.width + value.borrowed + 'px');
        });
        borrowedPixels(newDistribution);
      };
      var determineAppropriateDistributionOfExtraPixels = function (gridWidth) {
        var displayedColumns = grid.columns.displayed();
        var baseCombinedColumnWidthOfAll = 0;
        var baseCombinedColumnWidthOfUnchanged = 0;
        var nonScalingWidth = 0;
        var baseDistribution = {};
        displayedColumns.forEach(function (c) {
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
        return js.objects.mapProperties(baseDistribution, function (value, columnId) {
          var column = grid.columns.byId(columnId);
          if (!isResizable(column) || baseCombinedColumnWidthOfUnchanged && !isSameWidthAsPreviously(column))
            return value;
          var share = Math.round(value.width / scale * remainingSparePixels);
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
}({}, knockout, onefold_js, ko_grid);
ko_grid_column_scaling = function (main) {
  return main;
}(ko_grid_column_scaling_column_scaling);return ko_grid_column_scaling;
});