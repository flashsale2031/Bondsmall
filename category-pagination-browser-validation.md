# Category pagination validation

On the refreshed local index, selecting Electronics produced 23,802 indexed products and category pagination of 1,191 pages rather than the full-site 61,577 pages.

The category page displayed electronics records and the updated Go-to-page handler now calculates its limit from the active category total. The corresponding search-results handlers were updated to use the same category total for First, Prev, Next, Last, numbered buttons, and Go-to-page input.
