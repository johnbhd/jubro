import { JSONService } from '../services/jsonService.js';
import { trackerStateMethods } from './trackerState.js';
import { trackerUtilityMethods } from './trackerUtils.js';
import { trackerSortingMethods } from './trackerSorting.js';
import { trackerDashboardMethods } from './trackerDashboard.js';
import { trackerSearchMethods } from './trackerSearch.js';
import { applicationEditorMethods } from './applicationEditor.js';
import { trackerSettingsMethods } from './trackerSettings.js';
import { kanbanMethods } from './kanban.js';
import { trackerKeyboardMethods } from './trackerKeyboard.js';
import { trackerActionMethods } from './trackerActions.js';
import { trackerEventMethods } from './trackerEvents.js';

export class TrackerApp {
  constructor() {
    this.appBody = document.getElementById('appBody');
    this.boardContainer = document.getElementById('boardContainer');
    this.kanbanView = document.getElementById('kanbanView');
    this.kanbanColumns = document.getElementById('kanbanColumns');
    this.titleInput = document.getElementById('trackerTitleInput');
    this.searchWrapper = document.getElementById('searchWrapper');
    this.searchInput = document.getElementById('jobSearchInput');
    this.sortSelect = document.getElementById('boardSortSelect');
    this.selectTextSortWrapper = document.getElementById('selectTextSortWrapper');
    this.selectTextSortSelect = document.getElementById('selectTextSortSelect');
    this.selectValueFilterWrapper = document.getElementById('selectValueFilterWrapper');
    this.selectValueFilterSelect = document.getElementById('selectValueFilterSelect');
    this.btnClearSelectFilter = document.getElementById('btnClearSelectFilter');
    this.btnCloseSearch = document.getElementById('btnCloseSearch');
    this.noSearchResults = document.getElementById('noSearchResults');
    this.dashboardModal = document.getElementById('dashboardModal');
    this.dashboardSelectColumn = document.getElementById('dashboardSelectColumn');
    this.dashboardRangeSelect = document.getElementById('dashboardRangeSelect');
    this.dashboardCustomRange = document.getElementById('dashboardCustomRange');
    this.dashboardDateFrom = document.getElementById('dashboardDateFrom');
    this.dashboardDateTo = document.getElementById('dashboardDateTo');
    this.dashboardCards = document.getElementById('dashboardCards');
    this.dashboardCharts = document.getElementById('dashboardCharts');
    this.state = this.initializeState();
    this.jsonService = new JSONService();

    const route = this.applyTrackerRoute();

    if (route.status === 'invalid' || !route.key) {
      this.redirectToTrackers();
      return;
    }

    this.ensureCanonicalTrackerURL(route.key);
    this.initEvents();
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
  applicationEditorMethods,
  trackerSettingsMethods,
  kanbanMethods,
  trackerKeyboardMethods,
  trackerActionMethods,
  trackerEventMethods,
);
