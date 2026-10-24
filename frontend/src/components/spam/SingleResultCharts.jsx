import React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { Bar, Doughnut } from "react-chartjs-2";

const chartCardSx = {
    background: "#101622",
    border: "1px solid rgba(156,178,214,0.2)",
    borderRadius: 2,
    boxShadow: "none",
};

const titleSx = { color: "#f5f7fb", mb: 1, fontWeight: 800 };

export default function SingleResultCharts({ doughnutData, confidenceData, riskData, chartOptions, confidenceOptions, riskOptions, refs }) {
    return (
        <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
            {/*spam and safe likelihood chart*/}
            <Card sx={chartCardSx}>
                <CardContent>
                    <Typography variant="subtitle1" sx={titleSx}>Spam vs Safe</Typography>
                    {/*render only if the data exists*/}
                    {doughnutData && <Doughnut ref={refs.doughnutRef} data={doughnutData} options={chartOptions} />}
                </CardContent>
            </Card>
            <Card sx={chartCardSx}>
                <CardContent>
                    <Typography variant="subtitle1" sx={titleSx}>Confidence</Typography>
                    {confidenceData && <Bar ref={refs.confidenceRef} data={confidenceData} options={confidenceOptions} />}
                </CardContent>
            </Card>
            <Card sx={chartCardSx}>
                <CardContent>
                    <Typography variant="subtitle1" sx={titleSx}>Risk Level</Typography>
                    {riskData && <Bar ref={refs.riskRef} data={riskData} options={riskOptions} />}
                </CardContent>
            </Card>
        </Box>
    );
}
