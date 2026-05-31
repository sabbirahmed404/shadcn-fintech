import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const contactsPage = readFileSync("src/components/contacts/contacts-page-client.tsx", "utf8")

test("contact dropdown actions use Base UI click handlers", () => {
  assert.match(contactsPage, /DropdownMenuItem onClick=\{\(\) => openEdit\(contact\)\}/)
  assert.match(contactsPage, /onClick=\{\(\) => setDeleteTarget\(contact\)\}/)
  assert.doesNotMatch(contactsPage, /DropdownMenuItem[\s\S]*?onSelect=\{\(\) => openEdit\(contact\)\}/)
  assert.doesNotMatch(contactsPage, /DropdownMenuItem[\s\S]*?onSelect=\{\(\) => setDeleteTarget\(contact\)\}/)
})
