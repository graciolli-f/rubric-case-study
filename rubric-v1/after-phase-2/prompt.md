Add these features to the existing expense tracker:

1. EDIT EXISTING EXPENSES
   - Click anywhere on expense row (except delete button) to enter edit mode
   - Row highlights with a border when in edit mode
   - Form above auto-fills with that expense's data
   - Submit button changes to "Update Expense" 
   - New "Cancel" button appears next to Update button
   - While editing:
     * The expense being edited shows "Editing..." overlay
     * Other expenses are slightly dimmed (reduced opacity)
     * Cannot click other expenses until current edit is saved/cancelled
   - After update:
     * Expense flashes green briefly to confirm change
     * Form clears and returns to "Add" mode
     * If amount changed, total animates to new value

2. CATEGORY FILTERING
   - Add filter bar between form and expense list
   - Row of category buttons (same categories as dropdown)
   - Each button shows count in parentheses (e.g., "Food (8)")
   - Click button to toggle filter on/off:
     * Active filters highlighted with category color
     * Multiple categories can be active at once
     * Expenses fade out/in smoothly when filtered
   - "All" button to clear filters (shows total count)
   - When filtered:
     * Total at bottom shows filtered total
     * Add text: "Showing $X of $Y total"
     * Empty state: "No expenses in selected categories"