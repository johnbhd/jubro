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

    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);
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
