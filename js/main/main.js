import { JSONService } from '../services/jsonService.js';
import { trackerStateMethods } from './trackerState.js';
import { trackerUtilityMethods } from './trackerUtils.js';
import { trackerSortingMethods } from './trackerSorting.js';
import { trackerDashboardMethods } from './trackerDashboard.js';
import { trackerSearchMethods } from './trackerSearch.js';
import { trackerListViewMethods } from './trackerListView.js';
import { kanbanMethods } from './kanban.js';
import { statusSettingsMethods } from './statusSettings.js';
import { trackerKeyboardMethods } from './trackerKeyboard.js';
import { trackerActionMethods } from './trackerActions.js';
import { trackerEventMethods } from './trackerEvents.js';
import { jobSearchMethods } from './jobSearch.js';
import { jobSearchManagementMethods } from './jobSearchManagement.js';
import { applicationFormMethods } from './applicationForm.js';
import { insightsMethods } from './insights/render.js';
import { isInsightsPage } from './insights/navigation.js';

export class TrackerApp {
  constructor() {
    this.appBody = document.getElementById('appBody');
    this.isInsightsPage = isInsightsPage(window.location.pathname);
    this.appBody.dataset.workspacePage = this.isInsightsPage ? 'insights' : 'board';
    if (this.isInsightsPage) {
      document.documentElement.dataset.workspacePage = 'insights';
      document.title = 'Job Search Insights — Jubro';
      document.getElementById('boardTopNavbar')?.setAttribute('hidden', '');
      document.getElementById('appNavbar')?.setAttribute('hidden', '');
    } else {
      delete document.documentElement.dataset.workspacePage;
      document.getElementById('boardTopNavbar')?.removeAttribute('hidden');
      document.getElementById('appNavbar')?.removeAttribute('hidden');
    }
    this.boardWorkspace = document.getElementById('boardWorkspace');
    this.listView = document.getElementById('listView');
    this.kanbanView = document.getElementById('kanbanView');
    this.kanbanColumns = document.getElementById('kanbanColumns');
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
    this.sortSelect = document.getElementById('sortSelect');
    this.selectTextSortWrapper = document.getElementById('selectTextSortWrapper');
    this.selectTextSortSelect = document.getElementById('selectTextSortSelect');
    this.selectValueFilterWrapper = document.getElementById('selectValueFilterWrapper');
    this.selectValueFilterSelect = document.getElementById('selectValueFilterSelect');
    this.btnClearSelectFilter = document.getElementById('btnClearSelectFilter');
    this.btnCloseSearch = document.getElementById('btnCloseSearch');
    this.noSearchResults = document.getElementById('noSearchResults');
    this.boardPagination = document.getElementById('boardPagination');
    this.paginationPages = document.getElementById('paginationPages');
    this.btnPaginationPrev = document.getElementById('btnPaginationPrev');
    this.btnPaginationNext = document.getElementById('btnPaginationNext');
    this.dashboardModal = document.getElementById('dashboardModal');
    this.dashboardRangeSelect = document.getElementById('dashboardRangeSelect');
    this.dashboardCustomRange = document.getElementById('dashboardCustomRange');
    this.dashboardDateFrom = document.getElementById('dashboardDateFrom');
    this.dashboardDateTo = document.getElementById('dashboardDateTo');
    this.dashboardCards = document.getElementById('dashboardCards');
    this.dashboardSummary = document.getElementById('dashboardSummary');
    this.dashboardSubtitle = document.getElementById('dashboardSubtitle');
    this.dashboardEmptyState = document.getElementById('dashboardEmptyState');
    this.dashboardEmptyTitle = document.getElementById('dashboardEmptyTitle');
    this.dashboardEmptyDescription = document.getElementById('dashboardEmptyDescription');
    this.dashboardAddButton = document.getElementById('btnOverviewAddApplication');
    this.dashboardInsights = document.getElementById('dashboardInsights');
    this.state = this.initializeState();
    this.jsonService = new JSONService();
    this.clipboard = null;
    this.currentPage = 1;
    this.activeListFilters = {};

    if (!this.canOpenWorkspace() || !this.resolveBoardSearch()) {
      this.showWorkspaceRetry();
      return;
    }

    this.initEvents();
    this.eventsInitialized = true;
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
  kanbanMethods,
  statusSettingsMethods,
  trackerKeyboardMethods,
  trackerActionMethods,
  trackerEventMethods,
  jobSearchMethods,
  jobSearchManagementMethods,
  applicationFormMethods,
  insightsMethods
);
