import { JSONService } from '../services/jsonService.js';
import { trackerStateMethods } from './trackerState.js';
import { trackerUtilityMethods } from './trackerUtils.js';
import { trackerSortingMethods } from './trackerSorting.js';
import { trackerDashboardMethods } from './trackerDashboard.js';
import { trackerSearchMethods } from './trackerSearch.js';
import { trackerListViewMethods } from './trackerListView.js';
import { trackerKeyboardMethods } from './trackerKeyboard.js';
import { trackerTableActionMethods } from './trackerTableActions.js';
import { trackerEventMethods } from './trackerEvents.js';

export class TrackerApp {
  constructor() {
    this.appBody = document.getElementById('appBody');
    this.tableContainer = document.getElementById('tableContainer');
    this.tableView = document.getElementById('tableView');
    this.listView = document.getElementById('listView');
    this.listCards = document.getElementById('listCards');
    this.listSearchInput = document.getElementById('listSearchInput');
    this.listSortSelect = document.getElementById('listSortSelect');
    this.listFilterSections = document.getElementById('listFilterSections');
    this.listThisMonthCount = document.getElementById('listThisMonthCount');
    this.listTotalCount = document.getElementById('listTotalCount');
    this.titleInput = document.getElementById('trackerTitleInput');
    this.searchWrapper = document.getElementById('searchWrapper');
    this.searchInput = document.getElementById('jobSearchInput');
    this.viewSelect = document.getElementById('boardViewSelect');
    this.sortSelect = document.getElementById('tableSortSelect');
    this.selectTextSortWrapper = document.getElementById('selectTextSortWrapper');
    this.selectTextSortSelect = document.getElementById('selectTextSortSelect');
    this.selectValueFilterWrapper = document.getElementById('selectValueFilterWrapper');
    this.selectValueFilterSelect = document.getElementById('selectValueFilterSelect');
    this.btnClearSelectFilter = document.getElementById('btnClearSelectFilter');
    this.btnCloseSearch = document.getElementById('btnCloseSearch');
    this.noSearchResults = document.getElementById('noSearchResults');
    this.boardPagination = document.getElementById('boardPagination');
    this.paginationLabel = document.getElementById('paginationLabel');
    this.btnPaginationPrev = document.getElementById('btnPaginationPrev');
    this.btnPaginationNext = document.getElementById('btnPaginationNext');
    this.dashboardModal = document.getElementById('dashboardModal');
    this.dashboardSelectColumn = document.getElementById('dashboardSelectColumn');
    this.dashboardCards = document.getElementById('dashboardCards');
    this.dashboardCharts = document.getElementById('dashboardCharts');
    this.state = this.initializeState();
    this.jsonService = new JSONService();
    this.tableClipboard = null;
    this.currentPage = 1;
    this.activeListFilters = {};
    if (!this.getTracker()) {
      window.location.href = window.location.pathname.includes('/pages/')
        ? './tracker.html'
        : '/trackers';
      return;
    }
    this.initEvents();
    this.restoreBoardViewPreference();
    this.restoreListSortPreference();
    this.refresh({ persist: false });
  }
}

Object.assign(
  TrackerApp.prototype,
  trackerStateMethods,
  trackerUtilityMethods,
  trackerSortingMethods,
  trackerDashboardMethods,
  trackerSearchMethods,
  trackerListViewMethods,
  trackerKeyboardMethods,
  trackerTableActionMethods,
  trackerEventMethods
);
