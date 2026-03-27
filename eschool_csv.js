// ==UserScript==
// @name         超爽der 校務外掛
// @namespace    AlexW
// @version      1.2
// @description  Add 1000/2000/3000 options and per-table CSV export for eschool.tp.edu.tw
// @author       AlexW
// @match        https://eschool.tp.edu.tw/*
// @grant        none
// @license      MIT
// @run-at       document-end
// ==/UserScript==

/**
  ## 個人資料保護與免責聲明

  工具性質說明： 此腳本（以下簡稱「本程式」）僅提供自動化資料解析技術，不具備任何個資蒐集、儲存或遠端傳輸功能。

  使用者義務： 執行並使用本程式，即視為使用者同意擔任《個人資料保護法》所定義之資料控管責任主體，並承諾對解析前後之文件採取積極之安全維護措施（如加密、權限控管、定期刪除等）。

  責任歸屬： 若使用者因操作不當、管理疏失或違反個資法相關規範，導致個人資料外洩或侵害第三人權益，應由使用者自行承擔法律責任，概與本程式開發者無涉。

  授權前提： 如使用者無法落實上述安全維護措施，或不同意本聲明，即無權安裝或執行本程式。
 */

(function() {
    'use strict';

    /**
     * Extend the "Records per Page" dropdown options.
     */
    function extendPagination() {
        const selects = document.querySelectorAll('select.ui-pg-selbox[title="Records per Page"]');
        selects.forEach(select => {
            const extraValues = [1000, 2000, 3000];
            extraValues.forEach(val => {
                if (!select.querySelector(`option[value="${val}"]`)) {
                    const option = document.createElement('option');
                    option.value = val;
                    option.textContent = val;
                    option.setAttribute('role', 'option');
                    select.appendChild(option);
                }
            });
        });
    }

    /**
     * Scrape table data from a specific grid container and download as CSV.
     * @param {HTMLElement} gridBox - The .ui-jqgrid container.
     */
    function performExport(gridBox) {
        const dataTable = gridBox.querySelector('.ui-jqgrid-btable');
        const headerTable = gridBox.querySelector('.ui-jqgrid-htable');
        const gridTitle = gridBox.querySelector('.ui-jqgrid-title')?.innerText.trim() || 'export';

        let csvContent = "\uFEFF"; // UTF-8 BOM

        function processRows(table) {
            if (!table) return "";
            let localCsv = "";
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                // Ignore hidden rows and jqGrid's specific first row used for sizing
                if (row.style.display === 'none' || row.classList.contains('jqgfirstrow')) return;

                const cells = Array.from(row.querySelectorAll('th, td'));
                const rowData = cells.map(cell => {
                    // Just return the text without wrapping in double quotes
                    return cell.innerText.trim();
                }).join(',');

                // Only add rows that have content (ignore checkbox columns if empty)
                if (rowData.replace(/,/g, '').replace(/"/g, '').trim().length > 0) {
                    localCsv += rowData + "\r\n";
                }
            });
            return localCsv;
        }

        if (headerTable) csvContent += processRows(headerTable);
        if (dataTable) csvContent += processRows(dataTable);

        // Fallback for non-jqGrid tables within the div if any
        if (!headerTable && !dataTable) {
            const anyTable = gridBox.querySelector('table');
            if (anyTable) csvContent += processRows(anyTable);
            else {
                alert('找不到可匯出的表格資料！');
                return;
            }
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${gridTitle}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Inject an export button into each grid's title bar or pager.
     */
    function injectExportButtons() {
        // Target all jqGrid boxes
        const gridBoxes = document.querySelectorAll('.ui-jqgrid');

        gridBoxes.forEach(box => {
            // Avoid duplicate buttons
            if (box.querySelector('.antigravity-export-btn')) return;

            // Try to find the titlebar for injection
            let targetContainer = box.querySelector('.ui-jqgrid-titlebar');
            let isTitleBar = true;

            // If no titlebar, try the pager
            if (!targetContainer) {
                targetContainer = box.querySelector('.ui-pg-table') || box.querySelector('.ui-jqgrid-pager');
                isTitleBar = false;
            }

            if (!targetContainer) return;

            const btn = document.createElement('button');
            btn.className = 'antigravity-export-btn';
            btn.type = 'button';
            btn.innerText = '匯出 CSV';

            // Basic styling - adjust based on where it's injected
            btn.style.cssText = `
                margin: 0 5px;
                padding: 2px 10px;
                background: #4CAF50;
                color: white;
                border: 1px solid #3d8b40;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                vertical-align: middle;
            `;

            if (isTitleBar) {
                btn.style.float = 'right';
                btn.style.marginRight = '30px';
            }

            btn.onclick = (e) => {
                e.preventDefault();
                performExport(box);
            };

            targetContainer.appendChild(btn);
        });
    }

    // Use MutationObserver to handle dynamic rendering / grid reloads
    const observer = new MutationObserver((mutations) => {
        extendPagination();
        injectExportButtons();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial run
    extendPagination();
    injectExportButtons();
})();
