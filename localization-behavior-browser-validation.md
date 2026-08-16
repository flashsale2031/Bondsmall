# Localization behavior validation

The updated index loaded with the localization panel closed by default. The header displayed `EN` only.

After opening the panel, the UI showed the full language and currency selectors plus `Automatic currency`, indicating that currency was still linked to language/region.

Selecting Spanish changed the header abbreviation to `ES`, translated the visible UI strings, and closed the panel immediately. Reopening the control showed Spanish selected and automatic currency still active.

After selecting EUR manually, the header accessible label changed to Spanish language and Euro currency, the panel closed, and prices reformatted in euros. Reopening the panel showed EUR selected, confirming the explicit currency override persisted independently of the language setting.
