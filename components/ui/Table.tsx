"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";
import { cn } from "./cn";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable. */
  sortValue?: (row: T) => number | string;
  align?: "left" | "right";
  className?: string;
}

export type SortState = { column: string; direction: "asc" | "desc" } | null;

/**
 * Data table. Desktop: a real <table> with sortable headers (aria-sort). Phones: one card per row.
 * With `rowHref`, each row opens a page: the first cell holds the link, so it works by keyboard.
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  rowLabel,
  caption,
  initialSort = null,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  /** Accessible name of the row link, e.g. "Open report for Nov 7, 2026 pay stub". */
  rowLabel?: (row: T) => string;
  caption: string;
  initialSort?: SortState;
  empty?: ReactNode;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>(initialSort);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.column);
    if (!col?.sortValue) return rows;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = col.sortValue!(a);
      const y = col.sortValue!(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }, [rows, columns, sort]);

  const toggle = (id: string) =>
    setSort((s) => (s?.column === id ? { column: id, direction: s.direction === "asc" ? "desc" : "asc" } : { column: id, direction: "desc" }));

  if (rows.length === 0) return <>{empty}</>;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => {
                const active = sort?.column === c.id;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={active ? (sort!.direction === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined}
                    className={cn("px-4 py-3 text-[13px] font-medium text-fg-muted", c.align === "right" ? "text-right" : "text-left")}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggle(c.id)}
                        className={cn("inline-flex items-center gap-1 rounded hover:text-fg-primary", c.align === "right" && "flex-row-reverse")}
                      >
                        {c.header}
                        {active ? (
                          sort!.direction === "asc" ? (
                            <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
              {rowHref && (
                <th scope="col" className="w-8">
                  <span className="sr-only">Open</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  onClick={href ? () => router.push(href) : undefined}
                  className={cn("border-b border-border last:border-0", href && "cursor-pointer hover:bg-slate-50")}
                >
                  {columns.map((c, i) => (
                    <td key={c.id} className={cn("px-4 py-3 align-middle tabular-nums", c.align === "right" ? "text-right" : "text-left", c.className)}>
                      {i === 0 && href ? (
                        <Link href={href} aria-label={rowLabel?.(row)} className="font-medium text-fg-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                          {c.cell(row)}
                        </Link>
                      ) : (
                        c.cell(row)
                      )}
                    </td>
                  ))}
                  {href && (
                    <td className="pr-3 text-fg-muted">
                      <ChevronRight aria-hidden="true" className="h-4 w-4" />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden" aria-label={caption}>
        {sorted.map((row) => {
          const href = rowHref?.(row);
          const [first, ...rest] = columns;
          const body = (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-fg-primary">{first.cell(row)}</span>
                {href && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {rest.map((c) => (
                  <div key={c.id} className="min-w-0">
                    <dt className="text-xs text-fg-muted">{c.header}</dt>
                    <dd className="truncate tabular-nums text-fg-primary">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </>
          );
          return (
            <li key={rowKey(row)}>
              {href ? (
                <Link href={href} aria-label={rowLabel?.(row)} className="block px-4 py-3 hover:bg-slate-50">
                  {body}
                </Link>
              ) : (
                <div className="px-4 py-3">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
