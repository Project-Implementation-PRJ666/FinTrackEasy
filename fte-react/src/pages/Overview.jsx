import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useEffect, useRef, useState } from "react";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { toast } from "sonner";

import api from "@/api/axios";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import TransactionForm from "@/components/Form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import BudgetSummary from "../components/budget/BudgetSummary";
import CategoryFilter from "../components/CategoryFilter";
import SummarySection from "../components/SummarySection";
import TransactionDateFilter from "../components/TransactionDateFilter";
import TransactionList from "../components/TransactionList";

// Dictionaries for sorting filtered categories for incomes and expenses
export const allIncome = [
    "Gift",
    "Salary",
    "Extra Income",
    "Loan",
    "Parental Leave",
    "Business",
    "Insurance Payout",
    "Other",
];

export const allExpense = [
    "Food & Drink",
    "Car",
    "Shopping",
    "Bills & Fees",
    "Home",
    "Entertainment",
    "Travel",
    "Healthcare",
    "Family & Personal",
    "Transport",
    "Other",
];

// Customize Hook: Calculate Total Income, Total Expenses, Balance
function useTransactionTotals(transactions) {
    const totalIncome = transactions
        .filter((txn) => txn.type === "income")
        .reduce((sum, txn) => sum + Number(txn.amount), 0);

    const totalExpenses = transactions
        .filter((txn) => txn.type === "expense")
        .reduce((sum, txn) => sum + Number(txn.amount), 0);

    const balance = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, balance };
}

// Consolidation and sequencing transactions
function mergeAndSortTransactions(incomes, expenses) {
    return [...incomes, ...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Obtaining income/expenditure information
async function fetchIncomes(params) {
    const res = await api.get("/incomes/filter", { params });
    return res.data.map((txn) => ({ ...txn, type: "income" }));
}

async function fetchExpenses(params) {
    const res = await api.get("/expenses/filter", { params });
    return res.data.map((txn) => ({ ...txn, type: "expense" }));
}

// Filter transactions by date and classification
async function fetchFilteredTransactions(dateRange, selectedCategories, allIncome, allExpense) {
    if (!dateRange?.from || !dateRange?.to) {
        console.warn("Skipping fetch: dateRange is incomplete", dateRange);
        return [];
    }

    // Date handling: to ISO string
    const startLocal = new Date(dateRange.from);
    startLocal.setHours(0, 0, 0, 0);
    const startDate = new Date(
        startLocal.getTime() - startLocal.getTimezoneOffset() * 60000
    ).toISOString();

    const endLocal = new Date(dateRange.to);
    endLocal.setHours(0, 0, 0, 0);
    endLocal.setDate(endLocal.getDate() + 1);
    const endDate = new Date(
        endLocal.getTime() - endLocal.getTimezoneOffset() * 60000
    ).toISOString();

    const incomeCategories = selectedCategories.filter((c) => allIncome.includes(c));
    const expenseCategories = selectedCategories.filter((c) => allExpense.includes(c));

    const incomeParams = { startDate, endDate };
    const expenseParams = { startDate, endDate };

    // Only add categories if there is a selection
    if (incomeCategories.length > 0) {
        incomeParams.categories = incomeCategories.join(",");
    }

    if (expenseCategories.length > 0) {
        expenseParams.categories = expenseCategories.join(",");
    }

    // Always fetch both
    const [incomes, expenses] = await Promise.all([
        fetchIncomes(incomeParams),
        fetchExpenses(expenseParams),
    ]);

    return mergeAndSortTransactions(incomes, expenses);
}

export default function Overview() {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [editingData, setEditingData] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [selectedDelete, setSelectedDelete] = useState(null);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [addedExpense, setAddedExpense] = useState(null);
    const incomeChartRef = useRef(null);
    const expenseChartRef = useRef(null);

    useEffect(() => {
        console.log("Selected Categories State:", selectedCategories);
    }, [selectedCategories]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Default date range to today
    const today = new Date();
    const [dateRange, setDateRange] = useState({
        from: today,
        to: today,
    });

    const { totalIncome, totalExpenses, balance } = useTransactionTotals(transactions);

    useEffect(() => {
        fetchFilteredTransactions(dateRange, selectedCategories, allIncome, allExpense)
            .then(setTransactions)
            .catch(console.error);
    }, [dateRange, selectedCategories, refreshTrigger]);

    // Debug
    useEffect(() => {
        console.log("Selected categories updated:", selectedCategories);
    }, [selectedCategories]);

    useEffect(() => {
        console.log("Date range updated:", {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString(),
        });
    }, [dateRange]);

    const openDialog = (entryType) => {
        setType(entryType);
        setOpen(true);
    };

    const handleEdit = (txn) => {
        setEditingData(txn);
        setEditingId(txn._id);
        setType(txn.type);
        setOpen(true);
    };

    const handleDelete = (txn) => {
        setSelectedDelete(txn);
        setConfirmDelete(true);
    };

    const confirmDeleteEntry = async () => {
        try {
            const endpoint = selectedDelete.type === "income" ? "/incomes" : "/expenses";
            await api.delete(`${endpoint}/${selectedDelete._id}`);
            setConfirmDelete(false);
            setSelectedDelete(null);
            setRefreshTrigger((prev) => prev + 1);
            toast.success("Entry deleted successfully");
        } catch (err) {
            toast.error("Failed to delete entry");
            console.error(err);
        }
    };

    const handleFormClose = () => {
        setOpen(false);
        setEditingData(null);
        setEditingId(null);
        setRefreshTrigger((prev) => prev + 1);
    };

    // Prepare dynamic datasets for charts
    const incomeTransactions = transactions.filter((txn) => txn.type === "income");
    const expenseTransactions = transactions.filter((txn) => txn.type === "expense");

    const incomeData = groupTransactionsByDateAndCategory(incomeTransactions);
    const expenseData = groupTransactionsByDateAndCategory(expenseTransactions);

    function groupTransactionsByDateAndCategory(transactions) {
        const grouped = {};
        const allCategories = new Set();

        // First pass: collect categories
        transactions.forEach((txn) => {
            const category =
                txn.category === "Other" && txn.customCategory ? txn.customCategory : txn.category;

            allCategories.add(category);
        });

        // Second pass: group by date and category
        transactions.forEach((txn) => {
            const dateKey = format(new Date(txn.date), "MMM dd");
            const category =
                txn.category === "Other" && txn.customCategory ? txn.customCategory : txn.category;

            if (!grouped[dateKey]) {
                grouped[dateKey] = { date: dateKey };

                // Initialize all categories to 0 for this date
                allCategories.forEach((cat) => {
                    grouped[dateKey][cat] = 0;
                });
            }

            grouped[dateKey][category] += Number(txn.amount);
        });

        // Convert grouped object to sorted array
        return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    function getTopCategories(transactions, type) {
        const filtered = transactions.filter((txn) => txn.type === type);
        const categoryMap = {};

        filtered.forEach((txn) => {
            const category =
                txn.category === "Other" && txn.customCategory ? txn.customCategory : txn.category;
            categoryMap[category] = (categoryMap[category] || 0) + Number(txn.amount);
        });

        return Object.entries(categoryMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }

    const handleGenerateReport = async () => {
        try {
            const doc = new jsPDF("p", "pt", "a4");
            let y = 40;
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 40;
            const maxY = doc.internal.pageSize.getHeight() - 40;

            const formatCurrency = (value) =>
                `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

            const addPageNumber = (pageNum) => {
                doc.setFontSize(10);
                doc.setTextColor("#666");
                doc.text(`Page ${pageNum}`, pageWidth / 2, maxY, { align: "center" });
            };

            let pageNum = 1;

            // Title
            doc.setFontSize(20);
            doc.setTextColor("#333");
            doc.setFont("helvetica", "bold");
            doc.text("User Financial Report", pageWidth / 2, y, { align: "center" });
            y += 30;

            // Date Range Badge
            const dateRangeText = `Date Range: ${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}`;
            const badgeWidth = doc.getTextWidth(dateRangeText) + 20;
            const badgeX = (pageWidth - badgeWidth) / 2;
            const badgeY = y - 12;
            doc.setFillColor("#e0f2fe");
            doc.roundedRect(badgeX, badgeY, badgeWidth, 24, 6, 6, "F");
            doc.setFontSize(12);
            doc.setTextColor("#0369a1");
            doc.setFont("helvetica", "bold");
            doc.text(dateRangeText, pageWidth / 2, y + 2, { align: "center" });
            y += 40;

            // Summary Box
            const boxWidth = (pageWidth - margin * 2) / 3 - 10;
            const boxHeight = 60;
            const summaries = [
                { label: "Total Income", value: formatCurrency(totalIncome), color: "#4ade80" },
                { label: "Total Expenses", value: formatCurrency(totalExpenses), color: "#f87171" },
                { label: "Balance", value: formatCurrency(balance), color: "#60a5fa" },
            ];
            summaries.forEach((item, idx) => {
                const x = margin + idx * (boxWidth + 10);
                doc.setFillColor(item.color);
                doc.roundedRect(x, y, boxWidth, boxHeight, 8, 8, "F");
                doc.setFontSize(12);
                doc.setTextColor("#fff");
                doc.setFont("helvetica", "bold");
                doc.text(item.label, x + 10, y + 20);
                doc.setFontSize(14);
                doc.text(item.value, x + 10, y + 40);
            });
            y += boxHeight + 30;

            // Capture charts
            const captureChart = async (ref) => {
                if (!ref.current) return null;

                const svgNode = ref.current.querySelector("svg");
                if (svgNode) {
                    const svgString = new XMLSerializer().serializeToString(svgNode);
                    return new Promise((resolve) => {
                        const img = new Image();
                        const svgBlob = new Blob([svgString], {
                            type: "image/svg+xml;charset=utf-8",
                        });
                        const url = URL.createObjectURL(svgBlob);
                        img.onload = () => {
                            const scale = 2;
                            const canvas = document.createElement("canvas");
                            canvas.width = img.width * scale;
                            canvas.height = img.height * scale;
                            const ctx = canvas.getContext("2d");
                            ctx.scale(scale, scale);
                            ctx.drawImage(img, 0, 0);
                            URL.revokeObjectURL(url);
                            resolve({
                                dataUrl: canvas.toDataURL("image/png"),
                                width: img.width,
                                height: img.height,
                            });
                        };
                        img.src = url;
                    });
                }

                // fallback: html2canvas
                return html2canvas(ref.current, { scale: 2 }).then((canvas) => {
                    return {
                        dataUrl: canvas.toDataURL("image/png"),
                        width: canvas.width / 2,
                        height: canvas.height / 2,
                    };
                });
            };

            if (incomeChartRef.current && expenseChartRef.current) {
                const incomeImg = await captureChart(incomeChartRef);
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.setTextColor("#333");
                doc.text("Income Chart", margin, y);
                y += 10;

                const incomeWidth = pageWidth * 0.7;
                const incomeHeight = (incomeImg.height / incomeImg.width) * incomeWidth * 0.7;
                const incomeX = (pageWidth - incomeWidth) / 2;
                doc.addImage(incomeImg.dataUrl, "PNG", incomeX, y, incomeWidth, incomeHeight);
                y += incomeHeight + 10;

                const expenseImg = await captureChart(expenseChartRef);
                doc.text("Expense Chart", margin, y);
                y += 10;

                const expenseWidth = pageWidth * 0.7;
                const expenseHeight = (expenseImg.height / expenseImg.width) * expenseWidth * 0.7;
                const expenseX = (pageWidth - expenseWidth) / 2;
                doc.addImage(expenseImg.dataUrl, "PNG", expenseX, y, expenseWidth, expenseHeight);
                y += expenseHeight + 10;
            }

            const topIncome = getTopCategories(transactions, "income");
            const topExpenses = getTopCategories(transactions, "expense");

            const tableWidth = pageWidth - margin * 2;
            const colWidth = tableWidth / 2 - 10;

            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor("#000");
            doc.text("Top Categories", pageWidth / 2, y, { align: "center" });
            y += 24;

            const drawCategoryTable = (title, data, xStart, startY) => {
                const rowHeight = 18;
                let yPos = startY;

                doc.setFontSize(13);
                doc.setFillColor("#3b82f6");
                doc.setTextColor("#fff");
                doc.roundedRect(xStart, yPos - 14, colWidth, rowHeight, 4, 4, "F");
                doc.text(title, xStart + 10, yPos - 1);

                yPos += 12;

                doc.setFontSize(11);
                doc.setFont("helvetica", "normal");
                data.forEach(([category, amount], index) => {
                    const isEven = index % 2 === 0;
                    if (isEven) {
                        doc.setFillColor("#f1f5f9");
                        doc.rect(xStart, yPos - 10, colWidth, rowHeight, "F");
                    }
                    doc.setTextColor("#000");
                    doc.text(`${index + 1}. ${category}`, xStart + 8, yPos + 4);
                    doc.text(formatCurrency(amount), xStart + colWidth - 8, yPos + 4, {
                        align: "right",
                    });
                    yPos += rowHeight;
                });
            };

            const tableStartY = y;
            drawCategoryTable("Income", topIncome, margin, tableStartY);
            drawCategoryTable("Expenses", topExpenses, margin + colWidth + 20, tableStartY);
            y +=
                (topIncome.length > topExpenses.length ? topIncome.length : topExpenses.length) *
                    18 +
                36;

            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor("#000");
            doc.text("Transactions", pageWidth / 2, y, { align: "center" });
            y += 24;

            const headers = ["Date", "Category", "Type", "Amount"];
            const colWidths = [80, 180, 80, 80];
            const tableTotalWidth = colWidths.reduce((a, b) => a + b);
            let x = (pageWidth - tableTotalWidth) / 2;
            doc.setFontSize(12);
            doc.setTextColor("#fff");
            doc.setFillColor("#3b82f6");
            doc.rect(x, y - 12, tableTotalWidth, 20, "F");
            headers.forEach((header, i) => {
                doc.text(header, x + 2, y);
                x += colWidths[i];
            });
            y += 20;
            y += 4;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            let rowAlt = false;
            for (const txn of transactions) {
                if (y > maxY - 30) {
                    addPageNumber(pageNum);
                    doc.addPage();
                    pageNum++;
                    y = 40;
                    x = (pageWidth - tableTotalWidth) / 2;
                    doc.setFontSize(12);
                    doc.setTextColor("#fff");
                    doc.setFillColor("#3b82f6");
                    doc.rect(x, y - 12, tableTotalWidth, 20, "F");
                    headers.forEach((header, i) => {
                        doc.text(header, x + 2, y);
                        x += colWidths[i];
                    });
                    y += 20;
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(11);
                }

                if (rowAlt) {
                    doc.setFillColor("#f1f5f9");
                    doc.rect((pageWidth - tableTotalWidth) / 2, y - 12, tableTotalWidth, 18, "F");
                }

                const dateStr = format(new Date(txn.date), "yyyy-MM-dd");
                const category =
                    txn.category === "Other" && txn.customCategory
                        ? txn.customCategory
                        : txn.category;
                const type = txn.type.charAt(0).toUpperCase() + txn.type.slice(1);
                const amount = formatCurrency(txn.amount);

                x = (pageWidth - tableTotalWidth) / 2;
                [dateStr, category, type, amount].forEach((cell, i) => {
                    doc.setTextColor("#000");
                    doc.text(cell.toString(), x + 2, y);
                    x += colWidths[i];
                });

                y += 18;
                rowAlt = !rowAlt;
            }

            addPageNumber(pageNum);
            doc.save("Financial_Report.pdf");
        } catch (error) {
            console.error("Error generating report:", error);
        }
    };

    return (
        <div className="p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Top Controls */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-8">
                        <Button
                            variant="income"
                            onClick={() => openDialog("income")}
                            className="cursor-pointer w-30"
                        >
                            Add Income
                        </Button>
                        <Button
                            variant="expense"
                            onClick={() => openDialog("expense")}
                            className="cursor-pointer"
                        >
                            Add Expense
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <TransactionDateFilter
                            dateRange={dateRange}
                            onChange={(range) => {
                                if (!range?.from || !range?.to) {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    setDateRange({ from: today, to: today });
                                } else {
                                    setDateRange(range);
                                }
                            }}
                        />
                    </div>
                    <CategoryFilter
                        selectedCategories={selectedCategories}
                        dateRange={dateRange}
                        onChange={setSelectedCategories}
                        refreshTrigger={refreshTrigger}
                    ></CategoryFilter>{" "}
                </div>

                {/* Summary Cards */}
                <SummarySection balance={balance} income={totalIncome} expenses={totalExpenses} />
                {/* Generate Report Button TO DO: Implement functionality*/}
                <div className="grid justify-items-end">
                    <Button
                        variant="report"
                        className="cursor-pointer"
                        onClick={handleGenerateReport}
                    >
                        Generate Report
                    </Button>
                </div>
                {/* Charts */}
                <div className="flex flex-col md:flex-row justify-center items-center gap-10">
                    <div
                        className="bg-white shadow-lg rounded-lg p-8 h-80 w-full md:w-[90%]"
                        ref={incomeChartRef}
                        style={{ backgroundColor: "#ffffff", color: "#000000" }}
                    >
                        <div className="sticky top-0 left-0 right-0 bg-white z-20 text-center text-[18px] font-semibold mb-2">
                            Income
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={incomeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {incomeData.length > 0 &&
                                    Object.keys(incomeData[0])
                                        .filter((key) => key !== "date")
                                        .map((category, idx) => (
                                            <Line
                                                key={category}
                                                type="monotone"
                                                dataKey={category}
                                                stroke={
                                                    [
                                                        "#4ade80",
                                                        "#22d3ee",
                                                        "#10b981",
                                                        "#3b82f6",
                                                        "#facc15",
                                                    ][idx % 5]
                                                }
                                                strokeWidth={2}
                                                activeDot={{ r: 6 }}
                                            />
                                        ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div
                        className="bg-white shadow-lg rounded-lg p-8 h-80 w-full md:w-[90%]"
                        ref={expenseChartRef}
                        style={{ backgroundColor: "#ffffff", color: "#000000" }}
                    >
                        <div className="sticky top-0 left-0 right-0 bg-white z-20 text-center text-[18px] font-semibold mb-2">
                            Expenses
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={expenseData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {expenseData.length > 0 &&
                                    Object.keys(expenseData[0])
                                        .filter((key) => key !== "date")
                                        .map((category, idx) => (
                                            <Line
                                                key={category}
                                                type="monotone"
                                                dataKey={category}
                                                stroke={
                                                    [
                                                        "#ef4444",
                                                        "#f97316",
                                                        "#eab308",
                                                        "#8b5cf6",
                                                        "#ec4899",
                                                    ][idx % 5]
                                                }
                                                strokeWidth={2}
                                                activeDot={{ r: 6 }}
                                            />
                                        ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Transactions + Budgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Transactions */}
                    <TransactionList
                        transactions={transactions.map((txn) => ({
                            ...txn,
                            displayCategory:
                                txn.category === "Other" && txn.customCategory
                                    ? txn.customCategory
                                    : txn.category,
                        }))}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        showNote={false}
                    ></TransactionList>

                    {/* Budgets */}
                    <BudgetSummary
                        dateRange={dateRange}
                        confirmDelete={confirmDelete}
                        confirmEdit={open}
                        addedExpense={addedExpense}
                        setAddedExpense={setAddedExpense}
                    />

                    <ConfirmationDialog
                        open={confirmDelete}
                        setOpen={setConfirmDelete}
                        onConfirm={confirmDeleteEntry}
                        actionType="delete"
                        entry={{
                            category: selectedDelete?.category,
                            customCategory: selectedDelete?.customCategory,
                            note: selectedDelete?.note,
                            amount: selectedDelete?.amount,
                        }}
                    />
                </div>
            </div>

            {/* Edit / Add Transaction Form Modal */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <TransactionForm
                        type={type}
                        setOpen={handleFormClose}
                        editingId={editingId}
                        editingData={editingData}
                        triggerRefresh={refreshTrigger}
                        setAddedExpense={setAddedExpense}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

export {
    fetchExpenses,
    fetchFilteredTransactions,
    fetchIncomes,
    mergeAndSortTransactions,
    useTransactionTotals,
};
