import { listIndexMethods } from './listView/indexes.js';
import { listSettingsMethods } from './listView/settings.js';
import { listBadgeMethods } from './listView/badges.js';
import { listEditMethods } from './listView/editModal.js';
import { listFilterMethods } from './listView/filters.js';
import { listSortMethods } from './listView/sorting.js';
import { listRenderMethods } from './listView/render.js';
import { boardViewMethods } from './listView/boardView.js';

export const trackerListViewMethods = {
  ...listIndexMethods,
  ...listSettingsMethods,
  ...listBadgeMethods,
  ...listEditMethods,
  ...listFilterMethods,
  ...listSortMethods,
  ...listRenderMethods,
  ...boardViewMethods
};
