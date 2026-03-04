---
name: 'Add Everyday File Headers'

description: 'Adds a short plain-English description at the top of every file'

trigger: 'command'
---

Follow Yorkie Coding Constitution strictly (including the File Header rule).

For each file in the selected folder (or the whole src/ if none selected):

1\. Read the file and understand what it actually does in simple terms.

2\. If it already has a header block comment at the very top, improve it to be 2–5 everyday sentences.

3\. If no header, insert one at the VERY TOP (before any imports or code) in this exact format:

&nbsp; /\*

&nbsp; This file \[simple one-sentence description of what it does].

&nbsp; It handles \[main things it does] and makes sure \[key benefit or behavior].

&nbsp; \*/

4\. Keep the language friendly and non-technical (like explaining to a friend).

5\. Output the FULL updated file (complete, no "...").

6\. End with the YORKIE VALIDATED comment.

7\. Only process .ts, .tsx, .js, .jsx files.

Process one folder at a time so we can review changes safely.

<!-- YORKIE VALIDATED — workflow defined, header process established, file documentation standardized -->
