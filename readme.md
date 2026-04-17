# FlexTracker — MVP Guide

## 🎯 Purpose

A simple job application tracker.
Not multi-tracker. Not complex. Just log and view entries.

---

## 🧱 Core Idea

Each row = one job application.

---

## ✅ MVP Features (ONLY THESE)

* Add Row (job entry)
* Display Table
* Store in localStorage

---

## 📊 Table Columns

* Company
* Position
* Status
* Link
* Date Applied

---

## 🖥 UI Structure

### Header

* Back button
* Title: "Job Applications"
* "+ Add Row" (primary)
* "+ Add Column" (optional, basic only)

---

### Table

* Scrollable (mobile-friendly)
* Sticky header
* Clean rows with hover effect

---

### Empty State

"No data yet. Add a new row to get started."

---

### Modals

**Add Row**

* Inputs based on columns
* Save / Cancel

**Add Column (optional)**

* Column name
* Type (text only for now)

---

## 🚫 NOT INCLUDED (FOR NOW)

* Multiple trackers
* Monthly grouping
* Analytics / charts
* Authentication
* Firebase/backend
* Inline editing

---

## 🧠 Rule While Building

If a feature is not listed above → DON'T build it.

---

## 🎯 Goal

Finish a working version in 1–2 days.
Ugly but usable > perfect but unfinished.
