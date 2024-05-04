# Usability Testing Results
- Interview Date: 05/02/2024
- Extension Version: 0.3.0
- Interviewer: Daniel Luper (developer)
- Interviewee: Alpha Tester (100\% blind, uses VoiceOver on MacOS daily)

### Image Descriptions
- Alpha tester was confused by the semantics of "Image that contains Labrador retriever and could possibly have Staffordshire bullterrier, Staffordshire bull terrier." To him it sounded like there were two dogs (a Labrador and a terrier), even though there was just one dog. (fixed in 0.4.0)
- Alpha tester said that in a perfect world, descriptions should be descriptive for aesthetic images. For more technical things like graphs, he recommended staying away from adjectives. In particular he wished that the lightweight model outputted some adjectives.
- Alpha tester was initially impressed by the complex model since the description was well formulated. However, he was disappointed that it was innacurate.

### UI/UX
- In the login page, pressing "Enter" should make you submit your username/password. (fixed in 0.4.1)
- In the login page, the alpha tester expected something to happen after logging in. To clarify expectations, we can add slightly more descriptive info to the login page. (fixed in 0.4.1)
- In the settings page, clarify the Alt Text Display option like so, "Enable alt text display for sighted users (not recommended for use with screen readers)". (fixed in 0.4.1)
- In the settings page, clarify the "Enable Logging" option like so, "Share logs with developers for for quality service improvements". (fixed in 0.4.1)
- In the settings page, communicate the fact that you need to refresh any pages you’ve already opened for the settings changes to take effect. (fixed in 0.4.1)
- In the settings page, the alpha tester appreciated the ability to toggle between the lightweight and complex models.
- The "Save" button in the settings page was intuitive to use.

### Performance
- When running the complex model on the alpha tester’s MacBook with 16 GB of RAM and the M2 Pro, the system got laggy on a Wikipedia page with several images. Sometimes, VoiceOver would say, "Chrome not responding."
- The alpha tester said that the lightweight model was fast and responsive. The immediate descriptions were very nice to have.

### Bugs
- The alt text feedback score form sometimes shows up where it’s not supposed to show up (e.g., link to Instagram in Google Search results).
