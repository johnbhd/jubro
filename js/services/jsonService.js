import {
  TrackerDataValidationError,
  normalizeFullBackupImport,
  normalizeSingleTrackerImport,
} from './trackerData.js';

export class JSONService {
  parseJsonText(text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new TrackerDataValidationError(
        `Invalid JSON: ${error.message}`,
        'This file is not valid JSON.'
      );
    }
  }

  parseSingleTrackerText(text) {
    return normalizeSingleTrackerImport(this.parseJsonText(text));
  }

  parseFullBackupText(text) {
    return normalizeFullBackupImport(this.parseJsonText(text));
  }

  chooseJsonFile() {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;

    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        input.remove();
      };

      const finish = (callback, value) => {
        if (settled) return;

        settled = true;
        cleanup();
        callback(value);
      };

      input.addEventListener('change', () => {
        finish(resolve, input.files?.[0] || null);
      }, { once: true });

      input.addEventListener('cancel', () => {
        finish(resolve, null);
      }, { once: true });

      document.body?.appendChild(input);

      try {
        input.click();
      } catch (error) {
        finish(reject, error);
      }
    });
  }

  export(data, filename = "tracker.json") {
    if (!data) return;

    const exportData = {
      columns: data.columns,
      rows: data.rows
    };

    this.downloadJson(exportData, filename);
  }

  exportAll(state, filename = "jubro-backup.json") {
    if (!state || typeof state !== "object" || !state.data || typeof state.data !== "object") {
      throw new Error("Invalid Jubro tracker state");
    }

    const trackers = Object.entries(state.data).map(([trackerId, tracker]) => {
      if (!tracker || typeof tracker !== "object") {
        return {
          id: trackerId,
          value: tracker
        };
      }

      return {
        ...tracker,
        id: tracker.id || trackerId
      };
    });

    this.downloadJson({
      app: "Jubro",
      version: 1,
      exportedAt: new Date().toISOString(),
      active: state.active || null,
      trackers
    }, filename);
  }

  async importAll() {
    const file = await this.chooseJsonFile();

    if (!file) return null;

    return this.parseFullBackupText(await file.text());
  }

  downloadJson(data, filename) {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = filename;

    try {
      document.body.appendChild(a);
      a.click();
    } finally {
      a.remove();
      URL.revokeObjectURL(url);
    }
  }

  async import() {
    const file = await this.chooseJsonFile();

    if (!file) return null;

    return this.parseSingleTrackerText(await file.text());
  }
}
