"use client";

import { useState, useMemo } from "react";

interface ItemRow {
  name: string;
  amount: number;
  percentage: number;
  isCategory: boolean;
}

function parseItems(text: string): ItemRow[] {
  if (!text.trim()) return [];
  const lines = text.trim().split("\n");
  const rows: ItemRow[] = [];

  for (const line of lines) {
    const parts = line.split("\t").map((s) => s.trim());
    if (parts.length < 3) continue;

    const name = parts[0];
    const amountStr = parts[1].replace(/[円,]/g, "");
    const percentStr = parts[2].replace(/%/g, "");
    const amount = parseInt(amountStr, 10) || 0;
    const percentage = parseFloat(percentStr) || 0;
    const isCategory = name.includes("合計");

    rows.push({ name, amount, percentage, isCategory });
  }

  return rows;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("ja-JP") + "円";
}

const SAMPLE_ITEMS = `食費 合計\t17,415円\t13.25%
コンビニ\t9,224円\t7.02%
外食\t8,191円\t6.23%
教養・教育 合計\t1,500円\t1.14%
書籍\t1,500円\t1.14%
現金・カード 合計\t26,225円\t19.95%
カード引き落とし\t26,225円\t19.95%
通信費 合計\t6,911円\t5.26%
携帯電話\t6,911円\t5.26%
住宅 合計\t30,000円\t22.82%
実家のお金\t30,000円\t22.82%
税・社会保障 合計\t8円\t0.01%
所得税・住民税\t2円\t0.00%
その他税・社会保障\t6円\t0.00%
保険 合計\t190円\t0.14%
その他保険\t190円\t0.14%
その他 合計\t49,206円\t37.43%
奨学金返済\t16,000円\t12.17%
投資\t5,000円\t3.80%
雑費\t28,206円\t21.46%`;

export default function Home() {
  const [date, setDate] = useState("");
  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [comment, setComment] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const balance = useMemo(() => {
    const inc = parseInt(income.replace(/,/g, ""), 10) || 0;
    const exp = parseInt(expense.replace(/,/g, ""), 10) || 0;
    return inc - exp;
  }, [income, expense]);

  const parsedItems = useMemo(() => parseItems(itemsText), [itemsText]);

  const incomeNum = parseInt(income.replace(/,/g, ""), 10) || 0;
  const expenseNum = parseInt(expense.replace(/,/g, ""), 10) || 0;

  const handlePrint = () => {
    window.print();
  };

  const loadSample = () => {
    setDate("2025-01");
    setIncome("131455");
    setExpense("131455");
    setItemsText(SAMPLE_ITEMS);
    setComment("今月は外食が多かった。来月は自炊を増やす。");
  };

  return (
    <div className="min-h-screen py-8 px-4">
      {/* Input Form */}
      <div className="no-print max-w-2xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-green-800">
          家計簿作成ツール
        </h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4 border-t-4 border-green-600">
          <div>
            <label className="block text-sm font-medium mb-1">年月</label>
            <input
              type="month"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                収入（円）
              </label>
              <input
                type="text"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="例: 200000"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                支出（円）
              </label>
              <input
                type="text"
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
                placeholder="例: 150000"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded px-4 py-3">
            <span className="text-sm font-medium">収支（自動計算）：</span>
            <span
              className={`text-lg font-bold ml-2 ${
                balance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {balance >= 0 ? "+" : ""}
              {formatCurrency(balance)}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              各項目（タブ区切りで貼り付け）
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Money
              Forwardなどからコピーした「項目名→金額→割合」のタブ区切りデータを貼り付けてください
            </p>
            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              rows={12}
              placeholder={`食費 合計\t17,415円\t13.25%\nコンビニ\t9,224円\t7.02%\n外食\t8,191円\t6.23%`}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">コメント</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="今月の振り返りなど"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 font-medium cursor-pointer"
            >
              プレビュー表示
            </button>
            <button
              onClick={loadSample}
              className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 text-sm cursor-pointer"
            >
              サンプルデータ
            </button>
          </div>
        </div>
      </div>

      {/* Preview / Print Area */}
      {showPreview && (
        <>
          <div className="no-print max-w-2xl mx-auto mb-4 flex gap-3">
            <button
              onClick={handlePrint}
              className="bg-green-600 text-white py-2 px-6 rounded hover:bg-green-700 font-medium cursor-pointer"
            >
              印刷する
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 cursor-pointer"
            >
              プレビューを閉じる
            </button>
          </div>

          <div className="print-area max-w-[210mm] mx-auto bg-white shadow-lg border border-green-200">
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-4 border-b-2 border-green-700 pb-3">
                <h2 className="text-xl font-bold tracking-wider text-green-800">
                  家 計 簿
                </h2>
                {date && (
                  <p className="text-lg mt-1 font-medium text-green-700">
                    {date.replace("-", "年")}月
                  </p>
                )}
              </div>

              {/* Summary */}
              <div className="mb-4">
                <table className="summary-table w-full border-collapse">
                  <tbody>
                    <tr className="border border-green-400">
                      <td className="border border-green-400 bg-green-100 px-4 py-2 font-medium w-1/3 text-center text-green-800">
                        収入
                      </td>
                      <td className="border border-green-400 px-4 py-2 text-right">
                        {formatCurrency(incomeNum)}
                      </td>
                    </tr>
                    <tr className="border border-green-400">
                      <td className="border border-green-400 bg-green-100 px-4 py-2 font-medium text-center text-green-800">
                        支出
                      </td>
                      <td className="border border-green-400 px-4 py-2 text-right">
                        {formatCurrency(expenseNum)}
                      </td>
                    </tr>
                    <tr className="border border-green-400">
                      <td className="border border-green-400 bg-green-600 px-4 py-2 font-bold text-center text-white">
                        収支
                      </td>
                      <td
                        className={`border border-green-400 px-4 py-2 text-right font-bold ${
                          balance >= 0 ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {balance >= 0 ? "+" : ""}
                        {formatCurrency(balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Items Detail */}
              {parsedItems.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold mb-1 border-b-2 border-green-600 pb-1 text-green-800">
                    支出内訳
                  </h3>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-green-700 text-white">
                        <th className="border border-green-600 px-3 py-1.5 text-left">
                          項目
                        </th>
                        <th className="border border-green-600 px-3 py-1.5 text-right w-28">
                          金額
                        </th>
                        <th className="border border-green-600 px-3 py-1.5 text-right w-20">
                          割合
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedItems.map((item, idx) => (
                        <tr
                          key={idx}
                          className={
                            item.isCategory
                              ? "bg-green-100 font-bold border-t-2 border-t-green-500"
                              : "hover:bg-green-50"
                          }
                        >
                          <td
                            className={`border border-green-300 px-3 py-1 ${
                              item.isCategory
                                ? "text-green-800 bg-green-100"
                                : "pl-6"
                            }`}
                          >
                            {item.isCategory ? "■ " : ""}
                            {item.name}
                          </td>
                          <td
                            className={`border border-green-300 px-3 py-1 text-right ${
                              item.isCategory
                                ? "text-green-800 bg-green-100"
                                : ""
                            }`}
                          >
                            {formatCurrency(item.amount)}
                          </td>
                          <td
                            className={`border border-green-300 px-3 py-1 text-right ${
                              item.isCategory
                                ? "text-green-800 bg-green-100"
                                : ""
                            }`}
                          >
                            {item.percentage.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Comment */}
              {comment && (
                <div className="comment-section mb-2">
                  <h3 className="text-sm font-bold mb-1 border-b-2 border-green-600 pb-1 text-green-800">
                    コメント
                  </h3>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed p-2 border border-green-300 rounded bg-green-50 min-h-[3em]">
                    {comment}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
