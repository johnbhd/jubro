export class JSONService {
  normalizeColumns(columns) {
    return columns.map((column) => (
      typeof column === "object"
        ? column
        : {
            name: String(column || "New"),
            type: "text"
          }
    ));
  }

  normalizeRows(rows, columns) {
    return rows.map((row) => (
      columns.map((column, index) => {
        const cell = row?.[index];
        const columnType = typeof column === "object" && column.type ? column.type : "text";

        if (cell && typeof cell === "object" && "value" in cell) {
          return {
            ...cell,
            type: cell.type || columnType
          };
        }

        return {
          value: cell ?? "",
          type: columnType
        };
      })
    ));
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

  importAll() {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".json,application/json";

    return new Promise((resolve, reject) => {
      const cleanup = () => input.remove();

      input.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];

        if (!file) {
          cleanup();
          resolve(null);
          return;
        }

        try {
          const parsed = JSON.parse(await file.text());

          if (!parsed || !Array.isArray(parsed.trackers)) {
            throw new Error("Invalid Jubro backup file");
          }

          const data = Object.create(null);

          parsed.trackers.forEach((tracker, index) => {
            if (!tracker || typeof tracker !== "object" || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows)) {
              throw new Error(`Invalid tracker at position ${index + 1}`);
            }

            const sourceId = String(tracker.id || `imported_${index + 1}`);
            let trackerId = sourceId;
            let duplicateNumber = 2;

            while (Object.prototype.hasOwnProperty.call(data, trackerId)) {
              trackerId = `${sourceId}_${duplicateNumber}`;
              duplicateNumber += 1;
            }

            data[trackerId] = {
              ...tracker,
              id: trackerId
            };
          });

          const requestedActive = parsed.active === null || parsed.active === undefined
            ? null
            : String(parsed.active);

          resolve({
            active: requestedActive && data[requestedActive]
              ? requestedActive
              : Object.keys(data)[0] || null,
            data
          });
        } catch (error) {
          reject(error);
        } finally {
          cleanup();
        }
      }, { once: true });

      try {
        input.click();
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
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

  import(callback) {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".json";

    input.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];

      if (!file) return;

      try {
        const text = await file.text();

        const data = JSON.parse(text);

        if (!data.columns || !data.rows) {
          throw new Error("Invalid tracker file");
        }

        const columns = this.normalizeColumns(data.columns);

        callback({
          columns,
          rows: this.normalizeRows(data.rows, columns)
        });

      } catch (err) {
        console.error(err);
        alert("Invalid JSON file");
      }

      input.remove();
    });

    input.click();
  }
}
