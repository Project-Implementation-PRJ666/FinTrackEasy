import { useEffect, useRef, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function formatDateRange(range) {
    if (!range?.from) return "Select date range";
    const options = { year: "numeric", month: "long", day: "numeric" };
    if (!range.to) return range.from.toLocaleDateString(undefined, options);
    return `${range.from.toLocaleDateString(undefined, options)} - ${range.to.toLocaleDateString(undefined, options)}`;
}

export default function TransactionDateFilter({ dateRange = {}, onChange }) {
    const [dateText, setDateText] = useState("Select date");
    const [open, setOpen] = useState(false);

    const lastSelectedDate = useRef(null);

    const handleDateSelect = (range) => {
        if (range?.from && range?.to && range.from.getTime() === range.to.getTime()) {
            if (
                lastSelectedDate.current &&
                lastSelectedDate.current.getTime() === range.from.getTime()
            ) {
                return;
            }
            lastSelectedDate.current = range.from;
        } else {
            lastSelectedDate.current = null;
        }
        onChange(range);
    };

    // Only close the date-picker when the date range is selected
    useEffect(() => {
        setDateText(formatDateRange(dateRange));
        if (dateRange?.from && dateRange?.to) {
            setOpen(false);
        }
    }, [dateRange]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    onClick={() => setOpen(!open)}
                    className="px-4 py-2 border rounded-md shadow-sm text-sm"
                >
                    {dateText}
                </button>
            </PopoverTrigger>
            <PopoverContent className="p-4 rounded-lg border shadow-lg bg-white w-auto">
                <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={handleDateSelect}
                    numberOfMonths={2}
                    className="rounded-md border"
                />
            </PopoverContent>
        </Popover>
    );
}
