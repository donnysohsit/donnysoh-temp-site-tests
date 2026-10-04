# donnysoh-tempsite specification

## Conventions
- Sections with ids: #hero #about #skills #projects #repos #contact. All six must exist.
- Responsive: no horizontal scroll at a viewport width of 375px.
- #repos lists public GitHub repos as cards, or shows a plain message if there are none or the fetch fails.
- #hero, #contact contain links to email, GitHub and LinkedIn.

## Issue #1: dark-mode toggle
- A button in the nav toggles a 'dark' class on <body>.
- The choice is kept for the session.

## Issue #5: back-to-top button
- A back-to-top button exists and is not visible on page load.
- It becomes visible once the user has scrolled past the hero section.
- Clicking it returns the page to the top.
