# Budget Category Manager Design

## Goal

Add budget-page category management to the monthly category budget section without changing real transaction categories.

## Scope

The budget page will let users add, rename, update, reorder, and delete budget categories. These operations only affect the category cards/rings shown in the budget section and the per-category budget amounts. They must not update the `categories` table rows used by transactions, and they must not update existing transactions.

## Data Model

Budget categories will be stored in `profiles.category_budgets` as a versioned JSON object:

```json
{
  "version": 2,
  "items": [
    {
      "id": "food-dining",
      "name": "Food & Dining",
      "budget": 8000,
      "icon": "utensils",
      "color": "text-orange-500"
    }
  ]
}
```

The app will continue to read the legacy shape, `{ "Food & Dining": 8000 }`, and normalize it into v2 items. This protects existing data and keeps migration local to the app.

## User Experience

The existing ring click keeps opening the amount editor. A new `Manage categories` button opens a manager dialog. In that dialog, users can edit a category label, amount, icon, and color; move items up or down; add a category; and delete a category from the budget page.

Deleted categories are removed only from the budget configuration. Existing transactions and Supabase category records are untouched.

## Spending Matching

Monthly spending is still computed from transactions by category name. If a budget category name matches transaction category names, spending appears in that ring. If the user renames a budget category to a label that no transaction category uses, that budget category can show zero spending. This is expected because budget labels are independent from transaction categories.

## Validation

Names must be non-empty and unique within the budget page. Budgets must be positive numbers. The UI should prevent deleting the last remaining budget category.

## Testing

Add pure helper tests for normalizing legacy/v2 JSON, updating items, reordering items, adding unique categories, and deleting while preserving at least one category.
