import { useEffect, useState } from "react";
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
// TO DO: Install Hook for fetching income/expense by filter
//import useTransactions from "../hooks/useTransactions";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import TransactionForm from "@/components/Form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import CategoryFilter from "../components/CategoryFilter";
import SummarySection from "../components/SummarySection";
import TransactionDateFilter from "../components/TransactionDateFilter";
import TransactionList from "../components/TransactionList";

// Dictionaries for sorting filtered categories for incomes and expenses
const allIncome = [
    "Gift",
    "Salary",
    "Extra Income",
    "Loan",
    "Parental Leave",
    "Business",
    "Insurance Payout",
    "Other",
];

const allExpense = [
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

export default function Overview() {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [editingData, setEditingData] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [selectedDelete, setSelectedDelete] = useState(null);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Default date range to today
    const today = new Date();
    const [dateRange, setDateRange] = useState({
        from: today,
        to: today,
    });

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

    const fetchTransactions = async () => {
        try {
            // Convert date range to ISO strings (your existing timezone-safe logic)
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

            if (incomeCategories.length > 0) {
                incomeParams.categories = incomeCategories.join(",");
            }
            if (expenseCategories.length > 0) {
                expenseParams.categories = expenseCategories.join(",");
            }

            let incomes = [];
            let expenses = [];

            if (
                selectedCategories.length === 0 || // no filter → fetch both
                (incomeCategories.length > 0 && expenseCategories.length > 0)
            ) {
                const [incomeRes, expenseRes] = await Promise.all([
                    api.get("/incomes/filter", { params: incomeParams }),
                    api.get("/expenses/filter", { params: expenseParams }),
                ]);
                incomes = incomeRes.data.map((txn) => ({ ...txn, type: "income" }));
                expenses = expenseRes.data.map((txn) => ({ ...txn, type: "expense" }));
            } else if (incomeCategories.length > 0) {
                const incomeRes = await api.get("/incomes/filter", {
                    params: incomeParams,
                });
                incomes = incomeRes.data.map((txn) => ({ ...txn, type: "income" }));
            } else if (expenseCategories.length > 0) {
                const expenseRes = await api.get("/expenses/filter", {
                    params: expenseParams,
                });
                expenses = expenseRes.data.map((txn) => ({ ...txn, type: "expense" }));
            }

            setTransactions(
                [...incomes, ...expenses].sort((a, b) => new Date(b.date) - new Date(a.date))
            );
        } catch (err) {
            console.error("Error fetching filtered transactions:", err);
        }
    };

    // Fetch whenever dateRange or categories change
    useEffect(() => {
        fetchTransactions();
    }, [dateRange, selectedCategories, refreshTrigger]);

    // const fetchTransactions = async () => {
    //     try {
    //         const [incomeRes, expenseRes] = await Promise.all([
    //             api.get("/incomes"),
    //             api.get("/expenses"),
    //         ]);
    //         const incomes = incomeRes.data.map((txn) => ({ ...txn, type: "income" }));
    //         const expenses = expenseRes.data.map((txn) => ({ ...txn, type: "expense" }));
    //         setTransactions(
    //             [...incomes, ...expenses].sort((a, b) => new Date(b.date) - new Date(a.date))
    //         );
    //     } catch (err) {
    //         console.error("Error fetching transactions:", err);
    //     }
    // };

    // useEffect(() => {
    //     fetchTransactions();
    // }, []);

    // Calculate totals (filtering by type)
    const totalIncome = transactions
        .filter((txn) => txn.type === "income")
        // Uncomment when date filtering is fixed
        //.filter((txn) => new Date(txn.date) >= dateRange.from && new Date(txn.date) <= dateRange.to)
        .reduce((sum, txn) => sum + Number(txn.amount), 0);

    const totalExpenses = transactions
        .filter((txn) => txn.type === "expense")
        // Uncomment when date filtering is fixed
        //.filter((txn) => new Date(txn.date) >= dateRange.from && new Date(txn.date) <= dateRange.to)
        .reduce((sum, txn) => sum + Number(txn.amount), 0);

    const balance = totalIncome - totalExpenses;

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
            fetchTransactions();
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
        triggerRefresh();
    };

    const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

    const incomeData = [
        { date: "Jun 01", salary: 500, other: 100 },
        { date: "Jun 10", salary: 700, other: 200 },
        { date: "Jun 20", salary: 800, other: 150 },
        { date: "Jun 30", salary: 600, other: 250 },
    ];

    const foodDrinkData = [
        { date: "Jun 01", food: 120, drink: 80 },
        { date: "Jun 10", food: 150, drink: 90 },
        { date: "Jun 20", food: 200, drink: 100 },
        { date: "Jun 30", food: 180, drink: 120 },
    ];

    return (
        <div className="p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Top Controls */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2">
                        <Button variant="income" onClick={() => openDialog("income")}>
                            Add Income
                        </Button>
                        <Button variant="expense" onClick={() => openDialog("expense")}>
                            Add Expense
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <TransactionDateFilter dateRange={dateRange} onChange={setDateRange} />
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
                    <Button variant="report">Generate Report</Button>
                </div>
                {/* Charts */}
                <div className="flex flex-col md:flex-row justify-center items-center gap-10">
                    <div className="bg-white shadow rounded p-4 h-64 w-full md:w-[90%]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={incomeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="salary"
                                    stroke="#4ade80"
                                    strokeWidth={2}
                                    activeDot={{ r: 8 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="other"
                                    stroke="#22d3ee"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white shadow rounded p-4 h-64 w-full md:w-[90%]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={foodDrinkData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="food"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="drink"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Transactions + Budgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="bg-white shadow rounded p-4 space-y-4 border border-black">
                        <p className="font-semibold">Monthly Budgets</p>
                        <div className="text-sm space-y-2">
                            <div>
                                <p>Entertainment</p>
                                <div className="flex justify-between text-green-600">
                                    <span>60%</span>
                                    <span>$120.00 / $200.00</span>
                                </div>
                                <p className="text-xs">Remaining amount: $80.00</p>
                            </div>
                            <div>
                                <p>Fuel</p>
                                <div className="flex justify-between text-green-600">
                                    <span>40%</span>
                                    <span>$80.00 / $200.00</span>
                                </div>
                                <p className="text-xs">Remaining amount: $120.00</p>
                            </div>
                        </div>
                    </div>

                    <ConfirmationDialog
                        open={confirmDelete}
                        setOpen={setConfirmDelete}
                        onConfirm={confirmDeleteEntry}
                        actionType="delete"
                        entry={{
                            name: selectedDelete?.category,
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
                        triggerRefresh={triggerRefresh}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
