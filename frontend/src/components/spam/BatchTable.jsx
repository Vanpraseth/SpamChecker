import React from "react";
import { Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

const tableCellSx = { color: "#f5f7fb", borderColor: "rgba(156,178,214,0.14)" };
const headCellSx = { ...tableCellSx, color: "#9aa8bd", fontWeight: 800 };

export default function BatchTable({ rows }) {
    //defaults hiding the window if there is no data
    if (!rows || rows.length === 0) return null;
    return (
        //wrapped table with main color scheme
        <TableContainer component={Card} sx={{ maxWidth: '100%', overflowX: 'auto', background: '#101622', border: '1px solid rgba(156,178,214,0.2)', borderRadius: 2, boxShadow: 'none' }}>
            <Table size="small" sx={{ minWidth: 700 }}>
                <TableHead>
                    <TableRow>
                        {/*row name indexes*/}
                        <TableCell sx={headCellSx}>#</TableCell>
                        <TableCell sx={headCellSx}>Prediction</TableCell>
                        <TableCell sx={headCellSx}>Spam Prob</TableCell>
                        <TableCell sx={headCellSx}>Confidence</TableCell>
                        <TableCell sx={headCellSx}>Words</TableCell>
                        <TableCell sx={headCellSx}>Text Preview</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {/*render each row with the proper information*/}
                    {rows.map((r) => {
                        const isSpam = r.predicted_label === "spam";
                        const isError = r.predicted_label === "error";
                        const label = isError ? "ERROR" : isSpam ? "SPAM" : "SAFE";
                        const labelColor = isError ? "#fbbf24" : isSpam ? "#ff8fa3" : "#66ffe3";
                        return (
                            <TableRow key={r.index} hover>
                                <TableCell sx={tableCellSx}>{r.index}</TableCell>
                                <TableCell sx={{ ...tableCellSx, color: labelColor, fontWeight: 800 }}>
                                    {label}
                                </TableCell>
                                <TableCell sx={tableCellSx}>{typeof r.prob_spam === "number" ? (r.prob_spam * 100).toFixed(1) + "%" : "-"}</TableCell>
                                <TableCell sx={tableCellSx}>{typeof r.confidence === "number" ? (r.confidence * 100).toFixed(1) + "%" : "-"}</TableCell>
                                <TableCell sx={tableCellSx}>{r.wordCount}</TableCell>
                                <TableCell sx={{ ...tableCellSx, color: "#9aa8bd", maxWidth: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.text}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
