import React, { useMemo } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";


ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const cardSx = {
    background: "#101622",
    border: "1px solid rgba(156,178,214,0.2)",
    borderRadius: 2,
    boxShadow: "none",
};

const titleSx = { color: "#f5f7fb", fontWeight: 800 };
const mutedSx = { color: "#9aa8bd" };
const safeColor = "#20d6b5";
const spamColor = "#ff5c7a";
const mediumColor = "#fbbf24";

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
    },
    scales: {
        x: {
            ticks: { color: "#f5f7fb" },
            grid: { display: false },
        },
        y: {
            beginAtZero: true,
            ticks: { color: "#f5f7fb", precision: 0 },
            grid: { color: "rgba(156,178,214,0.08)" },
        },
    },
};

function spamChance(row) {
    const confidence = typeof row.confidence === "number" ? row.confidence : 0.5;
    return typeof row.prob_spam === "number"
        ? row.prob_spam
        : row.predicted_label === "spam"
          ? confidence
          : 1 - confidence;
}

export default function BatchCharts({ batchResults }) {
    const summary = useMemo(() => {
        const valid = (batchResults || []).filter(
            (row) => row?.predicted_label === "spam" || row?.predicted_label === "ham",
        );
        const spam = valid.filter((row) => row.predicted_label === "spam").length;
        const safe = valid.filter((row) => row.predicted_label === "ham").length;
        const risks = { low: 0, medium: 0, high: 0 };

        valid.forEach((row) => {
            const score = spamChance(row);
            if (score < 0.31) risks.low += 1;
            else if (score < 0.71) risks.medium += 1;
            else risks.high += 1;
        });

        return { total: valid.length, spam, safe, risks };
    }, [batchResults]);

    if (!summary.total) return null;

    const verdictData = {
        labels: ["Spam", "Safe"],
        datasets: [
            {
                data: [summary.spam, summary.safe],
                backgroundColor: [spamColor, safeColor],
            },
        ],
    };
    const reviewData = {
        labels: ["Probably safe", "Check again", "Likely spam"],
        datasets: [
            {
                data: [summary.risks.low, summary.risks.medium, summary.risks.high],
                backgroundColor: [safeColor, mediumColor, spamColor],
            },
        ],
    };

    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5, mb: 2 }}>
                <Card sx={cardSx}>
                    <CardContent>
                        <Typography sx={mutedSx}>Total checked</Typography>
                        <Typography variant="h4" sx={{ color: "#f5f7fb", fontWeight: 850 }}>{summary.total}</Typography>
                    </CardContent>
                </Card>
                <Card sx={cardSx}>
                    <CardContent>
                        <Typography sx={mutedSx}>Spam found</Typography>
                        <Typography variant="h4" sx={{ color: spamColor, fontWeight: 850 }}>{summary.spam}</Typography>
                    </CardContent>
                </Card>
                <Card sx={cardSx}>
                    <CardContent>
                        <Typography sx={mutedSx}>Safe found</Typography>
                        <Typography variant="h4" sx={{ color: safeColor, fontWeight: 850 }}>{summary.safe}</Typography>
                    </CardContent>
                </Card>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
                <Card sx={cardSx}>
                    <CardContent>
                        <Typography variant="subtitle1" sx={titleSx}>Spam vs Safe</Typography>
                        <Box sx={{ height: 260 }}>
                            <Bar data={verdictData} options={chartOptions} />
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={cardSx}>
                    <CardContent>
                        <Typography variant="subtitle1" sx={titleSx}>Review Needed</Typography>
                        <Box sx={{ height: 260 }}>
                            <Bar data={reviewData} options={chartOptions} />
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
}
