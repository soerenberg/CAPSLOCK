# Execution Plan

## General project configurations

- The project should be a static web application.
- The primary objective of the web app is to provide a fun and engaging way to learn all the capitals of the world.
- The web app is static, i.e., there should be no backend at all involved.
- The web app should use the React framework.
- The drag and drop behavior required (explained below) should include (work on) desktop machines and mobile devices (e.g. iOS, Android, tablets).

### Data and Static File organization

The app requires a list of all sovereign states (henceforth referred to as 'countries') on earth. This should be equal to the list of countries that are member of the UN and have an ISO 3166 code.
For a single country the following data is required:

- `id` A unique identifier equal to the countries iso3166_1_alpha2 code.
- `name` This should be the official name of the country as a string.
- `aliases` This should be a list of strings of common names the country is referred to. For instance, the sovereign state "United States of America" is also referred to as "USA", or the sovereign state of "Turkey" is also referred to as "Türkiye".
- `continents` This should be a list of continents the country is associated with. For instance, for "Germany" it should only be "Europe" for countries like "Russia" or "Turkey" the list could consist of "Asia" and "Europe". Use the 7 continent model.
- `groups` This should be a list of regions or even loose cultural groups the country is associated with. For instance, for "Sweden" it could be something along the way of "Scandinavia", "European Union", "NATO".
- `capitals` in the layout `capitals: [{ name, aliases, lat, lon }]` This should be a list of names of the country's capital and their aliases as strings. It should include the official name but also localized names, e.g. "Rome" and "Roma". The first item should be the most common and used capital name and alias.
- `flag:` { path, source, license, attributionRequired: boolean }

Use Wikipedia as a convenience for initial collection, but the inclusion rule is UN members with ISO 3166-1 codes.

For flag and country data proceed as follows:
  1. Add deps `world-countries` (country metadata, UN member flag, aliases) and `country-flag-icons` (flag SVGs).
  2. Add a script to generate public/data/countries.json and copy all flags into public/flags/ so the app reads only local static files.
  3. Build the React UI and quiz logic against that JSON.


#### Groups

Make sure to include at least the following groups:

* Asia and the Pacific
* Balkan States
* Baltics
* Caribbean
* Central America
* Central Asia
* Central Europe
* Commonwealth of Nations
* Eastern Africa
* Eastern Europe
* European Union
* Latin America
* Micronesian
* Island States
* NATO
* Nordics
* North America
* Northern Africa
* Northern Europe
* Polynesia
* Post-Soviet States
* Sahel Region
* Scandinavia
* South America
* Southeast Asia
* Southeast Europe
* Southern Europe
* Western Africa
* Western Asia
* Western Europe


### String comparison

The app will have to compare strings in the form of comparing a string entered by the user against (one of) the names (aliases) of a country or the name of its capital. Since many official names include special characters (e.g. umlauts), symbols or accents how this comparison is carried out is particularly important.
Before comparing two strings both strings should be normalized including converted to ASCII-ish normalized form, for instance:
* accents or diacritic should be removed so that the character `ù` gets converted to `u` or the umlaut `ö` is converted to `o`.
* cases should be converted to lower case, so that strings like `foo`, `Foo` or `FoO` all get mapped to `foo`.
As an example “São Tomé” should match “Sao Tome”. Moreover, all “São Tomé”,  “São Tomé and Principe” etc. should be included either as the official name or in the list of aliases.

More specifically, the normalization for the strings should occur through a normalize(input) function:
	•	Unicode normalize (NFKD),
	•	remove combining marks,
	•	lowercase,
	•	collapse whitespace,
	•	strip punctuation.

## Functional Description of the App

### Function: Main Menu

The initial screen of the web app should be a nice, stylish "main menu" style screen that offers the following selection:

1. "What?" This should include the following ways to select one out of 3 choices (their meaning explained later):
    a. Guess capitals from countries (actual name just a suggestion, feel free to find a better, nicer phrase). This should also be the default selection out of the 3 options,
    b. Guess countries from capitals (actual name just a suggestion, feel free to find a better, nicer phrase),
    c. Connect capitals and countries (actual name just a suggestion, feel free to find a better, nicer phrase).
    d. Guess countries from flags (actual name just a suggestion, feel free to find a better, nicer phrase).
    e. Guess flags from country names (actual name just a suggestion, feel free to find a better, nicer phrase).
    f. Locate capitals on a map (actual name just a suggestion, feel free to find a better, nicer phrase).
    g. Show countries, capitals, flags (actual name just a suggestion, feel free to find a better, nicer phrase).
2. "Where?" This should provide a selection to select a part of the world that should be included in the quiz. There should be a clear hierarchy. That is the following things should be selectable (the user can only select one though): 
    a. entire world. This should also be the default
    b. continents: list continents that apply
    c. other: groups such as regions could include things like 'Scandinavia', 'NATO', 'European Union', 'South East Asia', 'Sahel Region', 'Central Europe', 'Balkan States' and so on.
3. "How many?" This should offer a selection of how many questions the user plans to answer. Offer the following selections:
    a. "All (<NUMBER>)" That is, replace <NUMBER> by the actual number of countries with respect of the above selection. For instance, if the user selected 'Asia' or 'Scandinavia' above then <NUMBER> should be replaced by the number of countries in Asia or Scandinavia, respectively. This should be the default of this selection.
    b. "100" a random selection of 100 countries/capitals. If the number (called <NUMBER> above) is less than 100 this selection should be disabled and showed as grayed out or otherwise clearly unselectable.
    c. "50" a random selection of 50 countries/capitals. If the number (called <NUMBER> above) is less than 50 this selection should be disabled and showed as grayed out or otherwise clearly unselectable.
    d. "25" a random selection of 25 countries/capitals. If the number (called <NUMBER> above) is less than 25 this selection should be disabled and showed as grayed out or otherwise clearly unselectable.
    e. "10" a random selection of 10 countries/capitals. If the number (called <NUMBER> above) is less than 10 this selection should be disabled and showed as grayed out or otherwise clearly unselectable.
    f. Infinity (replaced by the infinity symbol), meaning here "until I stop". In this selection should be ongoing until the user decides to stop. This will inevitably mean that a given countries will appear multiple times in a single run. Such a run can only be ended by the user pressing the 'abort button'. Infinity mode is not applicable if "Connect capitals and countries" is selected above in which case this option should be disabled.

Below those selections should be prominent "start" button, which changes the state of the app from being in the main menu to starting a quiz with respect to the selections above.

Once the "start" button is pressed the following information should be preserved for later:
* `promptLabel` and `answerAccept` per mode, so “prompt-side list” is never confusing.
* A single `runConfig object: { mode, scope, countMode }` stored so evaluation screen can always explain what happened.

### Function: A quiz run

Depending on the selection from the main menu a run of a quiz should occur in the following subsections.
Before a new run (independently of the kind of quiz selected) we introduce and initialize some variables:
* <WRONG_GUESSES_LIST> a list initialized to be empty
* <NUM_CORRECT_GUESSES> an integer initialized to be 0.
* <NUM_WRONG_GUESSES> an integer initialized to be 0.
* <NUM_SKIPPED_GUESSES> an integer initialized to be 0.
* <SKIPPED_GUESSES_LIST> a list initialized to be empty
* <GAME_USES_POINT_SCORE> a boolean initialized to `false`.
* <POINT_SCORE> an integer initialized to be 0.
* <MAX_POINT_SCORE> an integer initialized to be 0.

Every time the app returns to the main menu perform this initialization.


We also define the notion of a `PromptItem`:

```
PromptItem = { kind: "country" | "capital" | "flag", id: string }
```
As a general rule, <WRONG_GUESSES_LIST> and <SKIPPED_GUESSES_LIST> should be homogenous lists of PromptItems, i.e., for a given game kind both list will only contain only a single kind of `PromptItems`, which is deteremined by the kind of the game.
As a further general rule, the `id` field of a PromptItem should match one unique `id` of a country (as introduced above) so that any `PromptItem` (of any kind) is always associated with a unique country.


#### If "Guess capitals from countries" was selected in the main menu

This quiz should make the user guess the capital of a given country one by one. To this end, the name of the country should be displayed together with its flag.
In this game all `PromptItems` will be of `kind` `country`.
Below should be a text field in which the user can make their guess. This text field should automatically have selected focus so that during doing a run the user does not need to use the mouse to repeatedly click on the (empty) text field to select focus. The textfield should have an appropriate placeholder text such "enter your guess" or similar.
Once the guess was confirmed by hitting the enter key by the user one of the following things should happen:
1. If the guess was correct, quickly show a green (use Catppuccin color) alert saying "Correct" for 0.5 seconds next to the guess, then advance to guessing the next capital. Here, a guess should be deemed correct if the user guesses any of the correct capital names. Apply the method of comparison explained above. Clear the input text and advance.
2. If the guess was incorrect, quickly show a red (use Catppuccin color) alert saying "Wrong" for 1 second next to the guess. Then, let the user guess again. Do not clear the text but highlight it. If a wrong guess has been entered for given country then that country should be appended to a list <WRONG_GUESSES_LIST> (unless it is already contained in that list) and <NUM_WRONG_GUESSES> should be increased by one.

Right next to the textfield should be two buttons:
1. "enter" clicking this button should have the exact same effect as hitting the enter key while the text field has focus (as described above).
2. "skip" pressing this button should advance to the next guess and add the current `PromptItem` to the end of the guessing queue. Additionally, the `PromptItem` to be skipped should be added to a list <SKIPPED_GUESSES_LIST> (unless it is already on that list). Also increase <NUM_SKIPPED_GUESSES> by one.
Below the text field and buttons should be a small text saying "<NUM_CORRECT_GUESSES> guesses made, <GUESSES_PENDING> pending" where <NUM_CORRECT_GUESSES> should be replaced by the number the user already entered correctly (do not count skipped) and <GUESSES_PENDING> by the number of guesses needed to clear the guessing queue.

Below the elements described above should be a clearly separated red button with the caption "abort" which end the quiz and advances to the evaluation screen described below. If the "abort" button is pressed and 'inifinity mode' was not selected, all items in the queue should be appended to <SKIPPED_GUESSES_LIST> and <NUM_SKIPPED_GUESSES> should be increased by the size of the queue, so that effectively all remaining items will be considered as skipped.
In case there are no more guesses to be made, meaning that the guessing queue is empty, then the app should advance to the evaluation screen.

The initial guessing queue should of course be the countries (or group thereof) selected in the main menu in random order.
At the very bottom right should be a small timer showing the time elapsed since starting the run. The time should be displayed in format HH:MM:SS.

#### If "Guess countries from capitals" was selected in the main menu

This selection should be analogous to the selection "Guess capitals from countries" with the roles of countries and capitals reversed, so that the user now has to guess the name of countries based on their given capital. Also, do not display flags here since it might reveal the country to be guessed.
In this game all `PromptItems` will be of `kind` `capital`.
Here, a guess should be deemed correct if the user guesses the correct countries name or any its aliases. Apply the method of comparison explained above.
At run start, pick exactly one promptCapital string per selected country (random but fixed for the run).
Otherwise, follow the same mechanics as the in "Guess capitals from countries".

#### If "Connect capitals and countries" was selected in the main menu

Here, the screen should be made up of two columns.

In the left column all selected countries (as selection made in the main menu) should be listed alphabetically top to bottom. So that the first country is rendered in the first row of the column, the second country in the second row and so on.
Each country should be rendered in an element that indicates that it might be dragged and dropped, so there should be a clear distinction in the form of a border or similar. Each such element should include the country's flag as a small icon at height about as the text height and next to it on the right the country's name.

Both columns should be rendered inside a limited box revealing at most 10 items that can be scrolled (vertically) independently. That is, the user should be able to scroll through each column without the entire page scrolling.

In the right column one capitals of the selected countries (as selection made in the main menu, choose the first capital in the `capitals` list for each country) should be listed alphabetically top to bottom. So that the first capital is rendered in the first row of the column, the second capital in the second row and so on.
Each capital should be rendered in an element that indicates that it might be dragged and dropped which should be consistent to the way countries are rendered in the left column as explained above.

Now the following behavior should be implemented:

* A country (from the left column) can be dragged and dropped onto a capital (from the right column).
* A capital (from the right column) can be dragged and dropped onto a country (from the left column). In case a country has multiple capitals listed, choose the first capital of that country (supposed to be the most common name or alias) at the beginning of the run.

We define 'valid drag and drop' event if either a country item is dropped onto a capital item or a capital item is dropped onto a country item. 
After a valid drag and drop event occurs (meaning either a country being dropped onto a capital, or a capital being dropped onto a country), exactly one of the two things should happen:
1. If the guess was correct, i.e. the capital involved belongs to the country involved, then there should be a very quick and subtle green (use Catppuccin colors) flash or alert on the screen letting the user know the guess was correct. Both the correctly guessed country and capitals should be removed from their respective columns, so that after a correct guess the lengths of both columns decreases by one (but have otherwise always equal lengths), where length denotes the number of items (countries or capitals). Also, increase <NUM_CORRECT_GUESSES> by one.
2. If the guess was incorrect then there should be a quick and subtle red (Catppuccin colors) flash or alert on the screen letting the user know that the guess was incorrect. The drag element should return to its original position so that the state before performing the action is reproduced. Additionally, the country involved in the guess should be added to the list <WRONG_GUESSES_LIST> (unless it is already contained in that list) and <NUM_WRONG_GUESSES> should be increased by one.
In case an invalid 'drag and drop event' occurs, e.g. if an item is dropped somewhere else, or a country items is dropped on another country item, or in free space, nothing should happen.

Below the elements described above should be a clearly separated red button with the caption "abort" which end the quiz and advances to the evaluation screen described below. If the "abort" button is pressed all countries remaining in the left column should appended to <SKIPPED_GUESSES_LIST> and <NUM_SKIPPED_GUESSES> should be increased by the number of remaining countries.

If all countries/capital combinations have been guessed correctly, that is, both left and right columns are empty, the app should automatically advance to the evaluation screen.
At the very bottom right should be a small timer showing the time elapsed since starting the run. The time should be displayed in format HH:MM:SS.

#### If "Guess countries from flags" was selected in the main menu

This quiz should make the user guess a country's name from its flag.
In this game all `PromptItems` will be of `kind` `flag`.
To this end, for a given country its flag should be rendered centered (horizontally) on the screen. For all purposes, this game is equal to the "Guess countries from capitals" game with the following exceptions:
* instead of the capital being revealed, the flag is rendered as outlined above.
* the lists <WRONG_GUESSES_LIST> and <SKIPPED_GUESSES_LIST> will contain flags not countries. In the evaluation screen flags should be rendered as images or icons of the height being equal to the text size / height.


#### If "Guess flags from country names" was selected in the main menu

This quiz should make the user select the flag of a given country. To this end, the name of the current country should be displayed.
In this game all `PromptItems` will be of `kind` `country`.

Below should be a grid of flags each rendered with a height of 25px. Each flag should be selectable in the sense that clicking on a flag should clearly mark it as selected. Clicking on a different flag should remove selection from the previous flag to this new flag, so that there is either no flag selected (before the first click on any flag occurs) or exactly one flag selected.

At the very button of the screen frozen, there should be 3 buttons displayed in a single row:
* A button with the caption "confirm". This button should initially be disabled or "inactive". Once any flag has been selected this button should be enabled.
* A button with the caption "skip". Pressing this button should advance to the next guess and add the country to the end of the guessing queue. Additionally, the country to be skipped should be added to a list <SKIPPED_GUESSES_LIST> (unless it is already on that list). Also increase <NUM_SKIPPED_GUESSES> by one.
* A red button with the caption "abort". This button should end the quiz and advances to the evaluation screen described below. If the "abort" button is pressed and 'inifinity mode' was not selected, all items in the queue should be appended to <SKIPPED_GUESSES_LIST> and <NUM_SKIPPED_GUESSES> should be increased by the size of the queue, so that effectively all remaining items will be considered as skipped.
Below this button row should be a small text saying "<NUM_CORRECT_GUESSES> guesses made, <GUESSES_PENDING> pending" where <NUM_CORRECT_GUESSES> should be replaced by the number the user already entered correctly (do not count skipped) and <GUESSES_PENDING> by the number of guesses needed to clear the guessing queue.

Once the guess was confirmed by clicking on the "confirm" button one of the following things should happen:
1. If the guess was correct, meaning that the selected flag belongs to the current country then quickly show a green (use Catppuccin color) alert saying "Correct" for 0.5 seconds next to the guess, then advance to guessing the next capital. Again, hide the "confirm" button, remove the correctly guessed flag from the grid, and advance to the next country, or (if the queue is empty) advance to the evaluation screen.
2. If the guess was not correct, quickly show a red (use Catppuccin color) alert saying "Wrong" for 1 second next to the guess. Then, let the user guess again. Clear the selection and hide the "confirm" button. If a wrong guess has been confirmed for given country then that country should be appended to a list <WRONG_GUESSES_LIST> (unless it is already contained in that list) and <NUM_WRONG_GUESSES> should be increased by one.

In case there are no more guesses to be made, meaning that the guessing queue is empty, then the app should advance to the evaluation screen.

The initial guessing queue should of course be the countries (or group thereof) selected in the main menu in random order.
At the very bottom right should be a small timer showing the time elapsed since starting the run. The time should be displayed in format HH:MM:SS.

#### If "Locate capitals on a map" was selected in the main menu

In this game the user's objective is to locate capitals on a world map.
At the beginning change <GAME_USES_POINT_SCORE> to `true`.

At the top line the flag (fitting to text) the country's name, a separator ` - ` and the country's capital should be shown.

Spanning the width of the usable screen there should be rendered a world map showing country borders. This map should be zoomable, so that
* on a mac if the user holds the command key and turns the scroll wheel on a mouse-like input device, the user is able to zoom in and out on that map.
* define a similar way to scroll on Windows and Linux desktop machines by adhering to common key combinations (perhaps by replacing the roll of the mac command key by the control key?).
* on a mobile device a pinch zoom action enables the user is able to zoom in and out on that map.

Next, a click on the map should display a clear distinctive marker on the map at the location of the map. This location (henceforth, referred to as <GUESS_GEO_LOCATION>) should be projected and represented as geo location (e.g. in latitude and longitude), so that the location remains on the same geographical location if the user zooms or scrolls (horizontally or vertically on the map).
Performing another click on the map should remove the previous marker and create a new one on the location of the last click.

At the very button of the screen frozen, there should be the followings buttons displayed in a single row:
* A button with the caption "confirm". This button should initially be disabled or "inactive". If a marker is set on the map, this button should be enabled.
* A button with the caption "skip". Pressing this button should advance to the next guess and add the current `PromptItem` to the end of the guessing queue. Additionally, the `PromptItem` to be skipped should be added to a list <SKIPPED_GUESSES_LIST> (unless it is already on that list). Also increase <NUM_SKIPPED_GUESSES> by one.
* A button "reset view" that resets the view (any zoom or scroll actions performed by the user).
* A red button with the caption "abort". This button should end the quiz and advances to the evaluation screen described below. If the "abort" button is pressed and 'inifinity mode' was not selected, all items in the queue should be appended to <SKIPPED_GUESSES_LIST> and <NUM_SKIPPED_GUESSES> should be increased by the size of the queue, so that effectively all remaining items will be considered as skipped.
Below this button row should be a small text saying "<NUM_CORRECT_GUESSES> guesses made, <GUESSES_PENDING> pending" where <NUM_CORRECT_GUESSES> should be replaced by the number the user already entered correctly (do not count skipped) and <GUESSES_PENDING> by the number of guesses needed to clear the guessing queue.

The initial guessing queue should of course be the countries (or group thereof) selected in the main menu in random order.
At the very bottom right should be a small timer showing the time elapsed since starting the run. The time should be displayed in format HH:MM:SS.

If the user confirmed their guess, that is, the marker was placed at least once on the map and the "confirm" was clicked, do the following:
1. Increase <MAX_POINT_SCORE> by 100.
2. Compute the haversine distances between the last set marker and all of the current country's capitals (if more than one) in kilometres.
3. Out of those distances determine the smallest distance <MIN_DISTANCE_KM>.
4. If <MIN_DISTANCE_KM> <= 100 then increase <POINT_SCORE> by 100.
   Else if <MIN_DISTANCE_KM> <= 500 increase <POINT_SCORE> by `floor((500 - <MIN_DISTANCE_KM>) / 4)`.
   Else (<MIN_DISTANCE_KM> > 500) do not increase <POINT_SCORE>.
5. If the guessing queue is empty advance to the evaluation screen, otherwise carry on with the next item on this list.
6. Advance to the next country to guess. Remove the marker from the map, do not reset any zoom or scroll levels the users might have done.


#### If "Show countries, capitals, flags" was selected in the main menu

This should be a mere informative screen and not a game as for the previous options.

The this end, this screen should primarily render a table of countries selected in the main menu in random order.
Above this table the name of what was selected under the "Where?" option in the main menu should be shown as a subtitle (e.g. "Europe" or "Scandinavia").

The table should have the following columns:
* "flag": render the flag of the country with 64px height
* "ISO 3166-1 alpha-2" The country's ISO 3166-1 alpha-2 code (that is, `id` from the data/json file explained above).
* "name and aliases" The country's name and all its aliases separated by a new line. The name should be at the very top in bold font, the aliases should follow below in alphabetical order.
* "continents" The country's continents separated by a new line.
* "capital(s)" The country's capitals separated by a new line.

The table should have a header column with the column names listed above all caps and bold font. This column should be clearly distinct to the remaining column to clearly identify it as a header. Moreover, it should be frozen and staying in place if the user scrolls through the table.

At the very button of the screen frozen, there should be a single buttons "back to main menu" that sends the app back to the main menu.

### Function: The evaluation screen

Once a single quiz run has been finished, either by completing the guesses by guessing all items correctly or by deliberately aborting a single run, the app should advance to the evaluation screen.
The evaluation screen should be structured as follows:
* If <GAME_USES_POINT_SCORE> is `false`:
    Then: Display the number of correct, wrong and skipped guesses: "<NUM_CORRECT_GUESSES> correct, <NUM_WRONG_GUESSES> mistakes, <NUM_SKIPPED_GUESSES> skipped". 
  Else if <GAME_USES_POINT_SCORE> is `true`:
    Display "Score: <POINT_SCORE> out of <MAX_POINT_SCORE>".
* Display the time the user needed to finish the run. That is, the time between the user clicking the "start" button on the main menu and finishing the run (advancing to the evaluation screen). The time should be displayed in format HH:MM:SS.
* Display the following buttons in a single line:
    * "rerun mistakes" this should start a fresh run (of the same kind of quiz as the previous run) with the selected guessing items equal to <WRONG_GUESSES_LIST>.
    * "rerun skips" this should start a fresh run (of the same kind of quiz as the previous run) with the selected guessing items equal to <SKIPPED_GUESSES_LIST>.
    * "rerun mistakes & skips" this should start a fresh run (of the same kind of quiz as the previous run) with the selected guessing items equal to the deduplicated union of the two lists <WRONG_GUESSES_LIST> and <SKIPPED_GUESSES_LIST>.
    * "reveal answers" (only show for games "Guess capitals from countries", "Guess countries from capitals", "Connect capitals and countries", "Guess countries from flags", "Guess flags from country names") this should send the app to "Show countries, capitals, flags" with the selected items equal to the deduplicated union of the two lists <WRONG_GUESSES_LIST> and <SKIPPED_GUESSES_LIST>.
    * "to main menu" this should bring the user back to the main menu as if they just started the app.
* Show a vertically arranged list of wrongly guessed items (that is, <WRONG_GUESSES_LIST>). That is, if the objective was to guess capitals from countries then this should display countries (and vice versa). In case the user chose "Connect capitals and countries" then it should only list countries.
* Show a vertically arranged list of skipped guessed items (that is, <SKIPPED_GUESSES_LIST>). That is, if the objective was to guess capitals from countries then this should display countries (and vice versa). In case the user chose "Connect capitals and countries" then it should only list countries.

#### Appearance

- Use "Catppuccin Flavor" Frappe.

## Design and Aesthetic choices

- The app should have a distinctive title displaying the app's name "CAPSLOCK" that is displayed at the top throughout, that is, in the main menu as well as any other screen (guessing, evaluation screen and so on).
- The webapp should use the Catppuccin color scheme throughout.
- The webapp should use bootstrap and react-bootstrap for design elements.
- The webapp should be minimalistic, clean, lean and functional first.
- Ideally, a coding associated font should be used throughout to give the app a friendly and nerdy feel.
- Where possible iconographics and symbols should be used. 
