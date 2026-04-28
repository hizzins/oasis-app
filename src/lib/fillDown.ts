/**
 * Fill-down logic for merged cells in Korean print broker work order sheets.
 *
 * Merged cell pattern:
 *   Row 2: 24.1.2 | 대치센터 | 남궁헌영 센터장님 | ...
 *   Row 3: (empty) | (empty) | (empty)           | ...  ← same client+contact
 *   Row 4: (empty) | (empty) | 우흥택 팀장님      | ...  ← same client, NEW contact
 *
 * Rules:
 *   - Column A (date): always fill-down
 *   - Column B (client): always fill-down
 *   - Column C (contact): fill-down WITHIN same client block only.
 *     If a new non-empty contact appears, start new group.
 *     If client changes, reset contact.
 */

type RawRow = (string | number | null | undefined)[];

export interface FillDownOptions {
  extraFillDownColumns?: number[];
}

function isEmpty(val: unknown): boolean {
  return val === null || val === undefined || val === "";
}

export function fillDownMergedCells(rows: RawRow[], options?: FillDownOptions): RawRow[] {
  if (rows.length === 0) return [];

  const extraCols = options?.extraFillDownColumns || [];
  const extraLast: Map<number, string | number | null> = new Map();
  for (const col of extraCols) {
    extraLast.set(col, null);
  }

  const result: RawRow[] = [];
  let lastDate: string | number | null = null;
  let lastClient: string | number | null = null;
  let lastContact: string | number | null = null;

  for (const row of rows) {
    const newRow = [...row];

    // Skip completely empty rows
    if (newRow.every((cell) => isEmpty(cell))) {
      continue;
    }

    // Column A (index 0): Date - always fill-down
    if (!isEmpty(newRow[0])) {
      lastDate = newRow[0]!;
    } else {
      newRow[0] = lastDate;
    }

    // Column B (index 1): Client - always fill-down
    let clientChanged = false;
    if (!isEmpty(newRow[1])) {
      const newClient = newRow[1];
      if (newClient !== lastClient) {
        lastClient = newClient as string;
        lastContact = null;
        clientChanged = true;
      }
    } else {
      newRow[1] = lastClient;
    }

    // Column C (index 2): Contact - fill-down within same client block
    if (!isEmpty(newRow[2])) {
      lastContact = newRow[2]!;
    } else {
      newRow[2] = lastContact;
    }

    // Extra columns (e.g., branch): fill-down within same client block
    // When client changes, reset extra columns to the new row's value (may be empty)
    for (const col of extraCols) {
      if (clientChanged) {
        // Client changed: use whatever value the new row has (don't carry over)
        extraLast.set(col, col < newRow.length && !isEmpty(newRow[col]) ? newRow[col]! : null);
      } else if (col < newRow.length && !isEmpty(newRow[col])) {
        extraLast.set(col, newRow[col]!);
      } else if (col < newRow.length) {
        newRow[col] = extraLast.get(col) ?? null;
      }
    }

    result.push(newRow);
  }

  return result;
}
