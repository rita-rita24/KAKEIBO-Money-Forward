"use client";

// ===== ライブラリのインポート =====
import { useState, useMemo, useRef, useCallback } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale";
import html2canvas from "html2canvas-pro"; // プレビュー画面をキャプチャしてPDF生成に使用
import { jsPDF } from "jspdf"; // PDF生成ライブラリ
import "react-datepicker/dist/react-datepicker.css";

// 日付ピッカーを日本語化
registerLocale("ja", ja);

/**
 * 支出内訳の1行分のデータ型
 * Money Forwardからコピーしたタブ区切りデータをパースした結果
 */
interface ItemRow {
  name: string;       // 項目名（例: 「食費 合計」「コンビニ」）
  amount: number;     // 金額（円）
  percentage: number; // 支出全体に対する割合（%）
  isCategory: boolean; // カテゴリ行（「合計」を含む行）かどうか
}

/**
 * タブ区切りテキストをパースして支出内訳の配列に変換する
 * 入力形式: 「項目名\t金額\t割合」の各行（Money Forward等からコピー）
 */
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

/** 数値を日本円表記にフォーマットする（例: 35000 → "35,000円"） */
function formatCurrency(value: number): string {
  return value.toLocaleString("ja-JP") + "円";
}

/** デモ用のサンプルデータ（タブ区切り形式） */
const SAMPLE_ITEMS = `食費 合計\t35,000円\t10.00%
コンビニ\t12,000円\t3.43%
スーパー\t10,500円\t3.00%
外食\t8,500円\t2.43%
カフェ\t4,000円\t1.14%
日用品 合計\t15,000円\t4.29%
日用品\t8,500円\t2.43%
ドラッグストア\t6,500円\t1.86%
趣味・娯楽 合計\t18,000円\t5.14%
サブスク\t5,900円\t1.69%
映画・音楽・ゲーム\t3,100円\t0.89%
本\t5,500円\t1.57%
ゲーム\t3,500円\t1.00%
交通費 合計\t25,000円\t7.14%
定期代\t16,870円\t4.82%
電車\t3,530円\t1.01%
バス\t2,600円\t0.74%
タクシー\t2,000円\t0.57%
衣服・美容 合計\t22,000円\t6.29%
美容院\t7,500円\t2.14%
衣服\t8,200円\t2.34%
アクセサリー\t6,300円\t1.80%
健康・医療 合計\t20,000円\t5.71%
プロテイン\t7,336円\t2.10%
フィットネス\t4,800円\t1.37%
歯科\t5,364円\t1.53%
薬局\t2,500円\t0.71%
教養・教育 合計\t30,000円\t8.57%
資格受験費用\t10,000円\t2.86%
AI\t3,297円\t0.94%
書籍\t12,703円\t3.63%
セミナー\t4,000円\t1.14%
現金・カード 合計\t15,000円\t4.29%
ATM引き出し\t10,000円\t2.86%
カード引き落とし\t5,000円\t1.43%
通信費 合計\t12,000円\t3.43%
携帯電話\t3,502円\t1.00%
インターネット\t4,400円\t1.26%
情報サービス\t1,538円\t0.44%
その他通信費\t2,560円\t0.73%
住宅 合計\t68,000円\t19.43%
家賃\t55,000円\t15.71%
光熱費\t13,000円\t3.71%
税・社会保障 合計\t30,000円\t8.57%
奨学金\t16,000円\t4.57%
所得税・住民税\t14,000円\t4.00%
保険 合計\t5,000円\t1.43%
生命保険\t5,000円\t1.43%
その他 合計\t55,000円\t15.71%
投資\t55,000円\t15.71%`;

export default function Home() {
  // ===== フォーム入力の状態管理 =====
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // 対象年月
  const [income, setIncome] = useState("");      // 収入（文字列で管理し、表示時に数値変換）
  const [expense, setExpense] = useState("");     // 支出
  const [savings, setSavings] = useState("");     // 貯金
  const [investment, setInvestment] = useState(""); // 投資信託
  const [crypto, setCrypto] = useState("");       // 暗号資産
  const [itemsText, setItemsText] = useState(""); // 支出内訳（タブ区切りテキスト）
  const [comment, setComment] = useState("");     // 振り返りコメント
  const [showPreview, setShowPreview] = useState(false); // プレビュー表示の切り替え

  // 収支 = 収入 − 支出（収入・支出が変わるたびに自動計算）
  const balance = useMemo(() => {
    const inc = parseInt(income.replace(/,/g, ""), 10) || 0;
    const exp = parseInt(expense.replace(/,/g, ""), 10) || 0;
    return inc - exp;
  }, [income, expense]);

  // 支出内訳テキストをパースした結果（テキストが変わるたびに再計算）
  const parsedItems = useMemo(() => parseItems(itemsText), [itemsText]);

  // 各入力値を数値に変換（カンマ区切りに対応）
  const incomeNum = parseInt(income.replace(/,/g, ""), 10) || 0;
  const expenseNum = parseInt(expense.replace(/,/g, ""), 10) || 0;
  const savingsNum = parseInt(savings.replace(/,/g, ""), 10) || 0;
  const investmentNum = parseInt(investment.replace(/,/g, ""), 10) || 0;
  const cryptoNum = parseInt(crypto.replace(/,/g, ""), 10) || 0;

  // PDF生成時にキャプチャするプレビュー領域への参照
  const printContentRef = useRef<HTMLDivElement>(null);

  /** ダウンロードファイル名に使う日付文字列を生成する（例: 「家計簿-2025年01月」） */
  const formatDateForTitle = useCallback(() => {
    if (!selectedDate) return "家計簿";
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    return `家計簿-${y}年${m}月`;
  }, [selectedDate]);

  /**
   * PDFダウンロード処理
   * プレビュー領域をhtml2canvasで画像化し、A4サイズのPDFとして保存する
   */
  const handlePrint = useCallback(async () => {
    const el = printContentRef.current;
    if (!el) return;

    // プレビュー領域を高解像度（2倍）で画像としてキャプチャする
    const canvas = await html2canvas(el, {
      scale: 2, // 高解像度で鮮明なPDFを生成
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    // JPEG形式（品質0.85）で変換し、ファイルサイズを抑える（通常1MB以下）
    const imgData = canvas.toDataURL("image/jpeg", 0.85);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A4用紙のサイズ（単位: mm）
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 8;        // 左右の余白
    const topMargin = 5;     // 上の余白
    const bottomMargin = 5;  // 下の余白

    const contentWidth = pdfWidth - margin * 2;
    const contentMaxHeight = pdfHeight - topMargin - bottomMargin;

    // 画像のアスペクト比を維持しながらコンテンツ領域に収まるよう拡縮する
    const ratio = imgWidth / imgHeight;
    let finalWidth = contentWidth;
    let finalHeight = contentWidth / ratio;

    // 高さがはみ出す場合は高さ基準で縮小する
    if (finalHeight > contentMaxHeight) {
      finalHeight = contentMaxHeight;
      finalWidth = contentMaxHeight * ratio;
    }

    // 水平方向の中央揃え
    const xOffset = margin + (contentWidth - finalWidth) / 2;

    const pdf = new jsPDF("portrait", "mm", "a4");
    pdf.addImage(imgData, "JPEG", xOffset, topMargin, finalWidth, finalHeight);
    pdf.save(`${formatDateForTitle()}.pdf`);
  }, [formatDateForTitle]);

  /**
   * CSVダウンロード処理
   * サマリー情報・支出内訳・コメントをCSV形式で出力する
   */
  const handleCsvDownload = useCallback(() => {
    // BOM（バイトオーダーマーク）を付与してExcelでの文字化けを防止
    const BOM = "\uFEFF";
    const lines: string[] = [];

    // CSVの先頭にタイトル行を追加
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = selectedDate.getMonth() + 1;
      lines.push(`${y}年${m}月 家計簿`);
    } else {
      lines.push("家計簿");
    }
    lines.push("");

    // 収入・支出などのサマリー情報を出力
    lines.push("項目,金額");
    lines.push(`収入,${incomeNum}`);
    lines.push(`支出,${expenseNum}`);
    lines.push(`収支,${balance}`);
    lines.push(`貯金,${savingsNum}`);
    lines.push(`投資信託,${investmentNum}`);
    lines.push(`暗号資産,${cryptoNum}`);
    lines.push("");

    // 支出内訳の各項目を出力（カンマを含む項目名はダブルクォートで囲む）
    if (parsedItems.length > 0) {
      lines.push("支出内訳");
      lines.push("項目,金額,割合");
      for (const item of parsedItems) {
        const name = item.name.includes(",") ? `"${item.name}"` : item.name;
        lines.push(`${name},${item.amount},${item.percentage.toFixed(2)}%`);
      }
      lines.push("");
    }

    // コメントを出力（カンマ・改行を含む場合はCSVエスケープ処理を行う）
    if (comment) {
      lines.push("コメント");
      const escaped = comment.includes(",") || comment.includes("\n")
        ? `"${comment.replace(/"/g, '""')}"`
        : comment;
      lines.push(escaped);
    }

    // CSV文字列を組み立ててBlobオブジェクトとしてダウンロードさせる
    const csvContent = BOM + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${formatDateForTitle()}.csv`;
    link.click();
    URL.revokeObjectURL(url); // メモリリークを防ぐためURLを解放
  }, [selectedDate, incomeNum, expenseNum, balance, savingsNum, investmentNum, cryptoNum, parsedItems, comment, formatDateForTitle]);

  /** デモ用にサンプルデータを全フィールドに読み込む */
  const loadSample = () => {
    setSelectedDate(new Date(2025, 0));
    setIncome("350000");
    setExpense("350000");
    setSavings("30000");
    setInvestment("10000");
    setCrypto("5000");
    setItemsText(SAMPLE_ITEMS);
    setComment("今月は外食が多かった。来月は自炊を増やす。\n投資信託の積立額を見直す予定。\n光熱費が季節的に上がっているので注意。");
  };

  return (
    <div className="min-h-screen py-8 px-4">
      {/* ===== 入力フォーム ===== */}
      <div className="no-print max-w-2xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-slate-700">
          家計簿作成ツール
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4 border-t-4 border-blue-400">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-600">
              年月
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => setSelectedDate(date)}
              dateFormat="yyyy年MM月"
              showMonthYearPicker
              locale="ja"
              placeholderText="年月を選択"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              wrapperClassName="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-600">
                収入（円）
              </label>
              <input
                type="text"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="例: 200000"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-600">
                支出（円）
              </label>
              <input
                type="text"
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
                placeholder="例: 150000"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              />
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg px-4 py-3 border border-amber-200">
            <span className="text-sm font-medium text-slate-600">
              収支（自動計算）：
            </span>
            <span
              className={`text-lg font-bold ml-2 ${balance >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
            >
              {balance >= 0 ? "+" : ""}
              {formatCurrency(balance)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-600">
                貯金（円）
              </label>
              <input
                type="text"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
                placeholder="例: 50000"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-600">
                投資信託（円）
              </label>
              <input
                type="text"
                value={investment}
                onChange={(e) => setInvestment(e.target.value)}
                placeholder="例: 30000"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-600">
                暗号資産（円）
              </label>
              <input
                type="text"
                value={crypto}
                onChange={(e) => setCrypto(e.target.value)}
                placeholder="例: 10000"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-600">
              各項目（タブ区切りで貼り付け）
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Money
              Forwardなどからコピーした「項目名→金額→割合」のタブ区切りデータを貼り付けてください
            </p>
            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              rows={12}
              placeholder={`食費 合計\t17,415円\t13.25%\nコンビニ\t9,224円\t7.02%\n外食\t8,191円\t6.23%`}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-600">
              コメント
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="今月の振り返りなど"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 font-medium cursor-pointer transition-colors"
            >
              プレビュー表示
            </button>
            <button
              onClick={loadSample}
              className="bg-slate-100 text-slate-600 py-2 px-4 rounded-lg hover:bg-slate-200 text-sm cursor-pointer transition-colors border border-slate-200"
            >
              サンプルデータ
            </button>
          </div>
        </div>
      </div>

      {/* ===== プレビュー・ダウンロード領域 ===== */}
      {showPreview && (
        <>
          <div className="no-print max-w-2xl mx-auto mb-4 flex gap-3">
            <button
              onClick={handlePrint}
              className="bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-600 font-medium cursor-pointer transition-colors"
            >
              PDFダウンロード
            </button>
            <button
              onClick={handleCsvDownload}
              className="bg-emerald-500 text-white py-2 px-6 rounded-lg hover:bg-emerald-600 font-medium cursor-pointer transition-colors"
            >
              CSVダウンロード
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="bg-slate-100 text-slate-600 py-2 px-4 rounded-lg hover:bg-slate-200 cursor-pointer transition-colors border border-slate-200"
            >
              プレビューを閉じる
            </button>
          </div>

          <div className="print-area max-w-[160mm] mx-auto bg-white shadow-lg border border-stone-200 rounded-lg overflow-hidden">
            <div ref={printContentRef} className="p-8 print-scale-wrapper">
              {/* タイトルヘッダー（家計簿タイトルと年月） */}
              <div className="text-center mb-5 border-b-2 border-stone-300 pb-3">
                <h2 className="text-xl font-bold tracking-[0.3em] text-stone-800">
                  家 計 簿
                </h2>
                {selectedDate && (
                  <p className="text-base mt-1 font-medium text-stone-500">
                    {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月
                  </p>
                )}
              </div>

              {/* サマリーテーブル（収入・支出・貯金など） */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                {/* 左側: 収入・支出・収支 */}
                <table className="summary-table w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="border border-stone-300 bg-sky-50 px-3 py-1.5 font-medium whitespace-nowrap text-center text-sky-800 text-sm">
                        収入
                      </td>
                      <td className="border border-stone-300 px-3 py-1.5 text-right text-sm text-stone-700">
                        {formatCurrency(incomeNum)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-stone-300 bg-rose-50 px-3 py-1.5 font-medium whitespace-nowrap text-center text-rose-800 text-sm">
                        支出
                      </td>
                      <td className="border border-stone-300 px-3 py-1.5 text-right text-sm text-stone-700">
                        {formatCurrency(expenseNum)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-stone-300 bg-stone-700 px-3 py-1.5 font-bold whitespace-nowrap text-center text-white text-sm">
                        収支
                      </td>
                      <td
                        className={`border border-stone-300 px-3 py-1.5 text-right font-bold text-sm ${balance >= 0 ? "text-sky-700" : "text-rose-600"
                          }`}
                      >
                        {balance >= 0 ? "+" : ""}
                        {formatCurrency(balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 右側: 貯金・投資信託・暗号資産 */}
                <table className="summary-table w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="border border-stone-300 bg-emerald-50 px-3 py-1.5 font-medium whitespace-nowrap text-center text-emerald-800 text-sm">
                        貯金
                      </td>
                      <td className="border border-stone-300 px-3 py-1.5 text-right text-sm text-stone-700">
                        {formatCurrency(savingsNum)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-stone-300 bg-violet-50 px-3 py-1.5 font-medium whitespace-nowrap text-center text-violet-800 text-sm">
                        投資信託
                      </td>
                      <td className="border border-stone-300 px-3 py-1.5 text-right text-sm text-stone-700">
                        {formatCurrency(investmentNum)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-stone-300 bg-amber-50 px-3 py-1.5 font-medium whitespace-nowrap text-center text-amber-800 text-sm">
                        暗号資産
                      </td>
                      <td className="border border-stone-300 px-3 py-1.5 text-right text-sm text-stone-700">
                        {formatCurrency(cryptoNum)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 支出内訳テーブル（カテゴリごとに項目・金額・割合を表示） */}
              {parsedItems.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold mb-1.5 border-b-2 border-stone-300 pb-1 text-stone-700">
                    支出内訳
                  </h3>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-stone-700 text-white">
                        <th className="border border-stone-600 px-3 py-1.5 text-center">
                          項目
                        </th>
                        <th className="border border-stone-600 px-3 py-1.5 text-center w-32">
                          金額
                        </th>
                        <th className="border border-stone-600 px-3 py-1.5 text-center w-16">
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
                              ? "bg-stone-100 font-bold border-t-2 border-t-stone-400"
                              : "hover:bg-stone-50"
                          }
                        >
                          <td
                            className={`border border-stone-200 px-3 py-1 ${item.isCategory
                              ? "text-stone-800"
                              : "pl-4 text-stone-600"
                              }`}
                          >
                            {item.isCategory ? "■ " : ""}
                            {item.name}
                          </td>
                          <td
                            className={`border border-stone-200 px-3 py-1 text-right ${item.isCategory
                              ? "text-stone-800"
                              : "text-stone-600"
                              }`}
                          >
                            {formatCurrency(item.amount)}
                          </td>
                          <td
                            className={`border border-stone-200 px-3 py-1 text-right ${item.isCategory
                              ? "text-stone-800"
                              : "text-stone-600"
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

              {/* コメント欄（振り返りメモの表示） */}
              {comment && (
                <div className="comment-section mb-2">
                  <h3 className="text-sm font-bold mb-1.5 border-b-2 border-stone-300 pb-1 text-stone-700">
                    コメント
                  </h3>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed p-2.5 border border-stone-200 rounded bg-stone-50 min-h-[3em] text-stone-600">
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
