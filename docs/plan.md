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
- `capitals` This should be a list of names of the country's capital and their aliases as strings. It should include the official name but also localized names, e.g. "Munich" and "München".
- `flag:` { path, source, license, attributionRequired: boolean }

Use Wikipedia as a convenience for initial collection, but the inclusion rule is UN members with ISO 3166-1 codes.

For flag and country data proceed as follows:
  1. Add deps `world-countries` (country metadata, UN member flag, aliases) and `country-flag-icons` (flag SVGs).
  2. Add a script to generate public/data/countries.json and copy all flags into public/flags/ so the app reads only local static files.
  3. Build the React UI and quiz logic against that JSON.

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

1. "How?" This should include the following ways to select one out of 3 choices (their meaning explained later):
    a. Guess capitals from countries (actual name just a suggestion, feel free to find a better, nicer phrase). This should also be the default selection out of the 3 options,
    b. Guess countries from capitals (actual name just a suggestion, feel free to find a better, nicer phrase),
    c. Connect capitals and countries (actual name just a suggestion, feel free to find a better, nicer phrase).
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

As a general rule, <WRONG_GUESSES_LIST> and <SKIPPED_GUESSES_LIST> should be items from the prompt side (what the user saw) always.

#### If "Guess capitals from countries" was selected in the main menu

This quiz should make the user guess the capital of a given country one by one. To this end, the name of the country should be displayed together with its flag.
Below should be a text field in which the user can make their guess. This text field should automatically have selected focus so that during doing a run the user does not need to use the mouse to repeatedly click on the (empty) text field to select focus. The textfield should have an appropriate placeholder text such "enter your guess" or similar.
Once the guess was confirmed by hitting the enter key by the user one of the following things should happen:
1. If the guess was correct, quickly show a green (use Catppuccin color) alert saying "Correct" for 0.5 seconds next to the guess, then advance to guessing the next capital. Here, a guess should be deemed correct if the user guesses any of the correct capital names. Apply the method of comparison explained above. Clear the input text and advance.
2. If the guess was incorrect, quickly show a red (use Catppuccin color) alert saying "Wrong" for 1 second next to the guess. Then, let the user guess again. Do not clear the text but highlight it. If a wrong guess has been entered for given country then that country should be appended to a list <WRONG_GUESSES_LIST> (unless it is already contained in that list) and <NUM_WRONG_GUESSES> should be increased by one.

Right next to the textfield should be two buttons:
1. "enter" clicking this button should have the exact same effect as hitting the enter key while the text field has focus (as described above).
2. "skip" pressing this button should advance to the next guess and add the capital/country to the end of the guessing queue. Additionally, the country to be skipped should be added to a list <SKIPPED_GUESSES_LIST> (unless it is already on that list). Also increase <NUM_SKIPPED_GUESSES> by one.
Below the text field and buttons should be a small text saying "<NUM_CORRECT_GUESSES> guesses made, <GUESSES_PENDING> pending" where <NUM_CORRECT_GUESSES> should be replaced by the number the user already entered correctly (do not count skipped) and <GUESSES_PENDING> by the number of guesses needed to clear the guessing queue.

Below the elements described above should be a clearly separated red button with the caption "abort" which end the quiz and advances to the evaluation screen described below. If the "abort" button is pressed and 'inifinity mode' was not selected, all items in the queue should be appended to <SKIPPED_GUESSES_LIST> and <NUM_SKIPPED_GUESSES> should be increased by the size of the queue, so that effectively all remaining items will be considered as skipped.
In case there are no more guesses to be made, meaning that the guessing queue is empty, then the app should advance to the evaluation screen.

The initial guessing queue should of course be the countries (or group thereof) selected in the main menu in random order.
At the very bottom right should be a small timer showing the time elapsed since starting the run. The time should be displayed in format HH:MM:SS.

#### If "Guess countries from capitals" was selected in the main menu

This selection should be analogous to the selection "Guess capitals from countries" with the roles of countries and capitals reversed, so that the user now has to guess the name of countries based on their given capital. Also, do not display flags here since it might reveal the country to be guessed.
Here, a guess should be deemed correct if the user guesses the correct countries name or any its aliases. Apply the method of comparison explained above.
Otherwise, follow the same mechanics as the in "Guess capitals from countries".

#### If "Connect capitals and countries" was selected in the main menu

Here, the screen should be made up of two columns.

In the left column all selected countries (as selection made in the main menu) should be listed alphabetically top to bottom. So that the first country is rendered in the first row of the column, the second country in the second row and so on.
Each country should be rendered in an element that indicates that it might be dragged and dropped, so there should be a clear distinction in the form of a border or similar. Each such element should include the country's flag as a small icon at height about as the text height and next to it on the right the country's name.

In the right column all capitals of the selected countries (as selection made in the main menu) should be listed alphabetically top to bottom. So that the first capital is rendered in the first row of the column, the second capital in the second row and so on.
Each capital should be rendered in an element that indicates that it might be dragged and dropped which should be consistent to the way countries are rendered in the left column as explained above.

Now the following behavior should be implemented:

* A country (from the left column) can be dragged and dropped onto a capital (from the right column).
* A capital (from the right column) can be dragged and dropped onto a country (from the left column). In case a country has multiple capitals listed, choose one if its capitals at random at the beginning of the run.

We define 'valid drag and drop' event if either a country item is dropped onto a capital item or a capital item is dropped onto a country item. 
After a valid drag and drop event occurs (meaning either a country being dropped onto a capital, or a capital being dropped onto a country), exactly one of the two things should happen:
1. If the guess was correct, i.e. the capital involved belongs to the country involved, then there should be a very quick and subtle green (use Catppuccin colors) flash or alert on the screen letting the user know the guess was correct. Both the correctly guessed country and capitals should be removed from their respective columns, so that after a correct guess the lengths of both columns decreases by one (but have otherwise always equal lengths), where length denotes the number of items (countries or capitals). Also, increase <NUM_CORRECT_GUESSES> by one.
2. If the guess was incorrect then there should be a quick and subtle red (Catppuccin colors) flash or alert on the screen letting the user know that the guess was incorrect. The drag element should return to its original position so that the state before performing the action is reproduced. Additionally, the country involved in the guess should be added to the list <WRONG_GUESSES_LIST> (unless it is already contained in that list) and <NUM_WRONG_GUESSES> should be increased by one.
In case an invalid 'drag and drop event' occurs, e.g. if an item is dropped somewhere else, or a country items is dropped on another country item, or in free space, nothing should happen.

Below the elements described above should be a clearly separated red button with the caption "abort" which end the quiz and advances to the evaluation screen described below. If the "abort" button is pressed all countries remaining in the left column should appended to <SKIPPED_GUESSES_LIST> and <NUM_SKIPPED_GUESSES> should be increased by the number of remaining countries.

If all countries/capital combinations have been guessed correctly, that is, both left and right columns are empty, the app should automatically advance to the evaluation screen.
At the very bottom right should be a small timer showing the time elapsed since starting the run. The time should be displayed in format HH:MM:SS.

### Function: The evaluation screen

Once a single quiz run has been finished, either by completing the guesses by guessing all items correctly or by deliberately aborting a single run, the app should advance to the evaluation screen.
The evaluation screen should be structured as follows:
* Display the number of correct, wrong and skipped guesses: "<NUM_CORRECT_GUESSES> correct, <NUM_WRONG_GUESSES> mistakes, <NUM_SKIPPED_GUESSES> skipped". 
* Display the time the user needed to finish the run. That is, the time between the user clicking the "start" button on the main menu and finishing the run (advancing to the evaluation screen). The time should be displayed in format HH:MM:SS.
* Display four buttons in a single line:
    * "rerun mistakes" this should start a fresh run (of the same kind of quiz as the previous run) with the selected guessing items equal to <WRONG_GUESSES_LIST>.
    * "rerun skips" this should start a fresh run (of the same kind of quiz as the previous run) with the selected guessing items equal to <SKIPPED_GUESSES_LIST>.
    * "rerun mistakes & skips" this should start a fresh run (of the same kind of quiz as the previous run) with the selected guessing items equal to the deduplicated union of the two lists <WRONG_GUESSES_LIST> and <SKIPPED_GUESSES_LIST>.
    * "to main menu" this should bring the user back to the main menu as if they just started the app.
* Show a vertically arranged list of wrongly guessed items (that is, <WRONG_GUESSES_LIST>). That is, if the objective was to guess capitals from countries then this should display countries (and vice versa). In case the user chose "Connect capitals and countries" then it should only list countries.
* Show a vertically arranged list of skipped guessed items (that is, <SKIPPED_GUESSES_LIST>). That is, if the objective was to guess capitals from countries then this should display countries (and vice versa). In case the user chose "Connect capitals and countries" then it should only list countries.

### Function: Side Menu

The app should have a side menu that slides in from the left via a 'tool' (symbol) button in the bottom left.

The side menu should offer the following settings. Use the mentioned subsection as subsection is the menu as well.

#### Appearance

- "Catppuccin Flavor" Make a selection of the 4 Catppuccin Flavors (Latte, Frappe, Macchiato, Mocha) but default to Frappe.
- Have a selection to select the font for the app. Offer a good variety of choices for the reader of freely available fonts permissive license compatible with MIT distribution; store license + attribution requirements and show attribution if required.

## Design and Aesthetic choices

- The app should have a distinctive title displaying the app's name "CAPSLOCK" that is displayed at the top throughout, that is, in the main menu as well as any other screen (guessing, evaluation screen and so on).
- The webapp should use the Catppuccin color scheme throughout.
- The webapp should use bootstrap and react-bootstrap for design elements.
- The webapp should be minimalistic, clean, lean and functional first.
- Ideally, a coding associated font should be used throughout to give the app a friendly and nerdy feel.
- Where possible iconographics and symbols should be used. 
