I built a test subscription page to test out the automatic subscription cancellation feature of modern mail.
Right now, there is a demo user loaded by default.
I want it to work like a production site. Don't automatically initialize a user. If there is no user, go to the login page, which has already been created. If authenticated already, don't navigate to the login page if the user goes there. Just navigate to the plans page.

Also the magic link flow, it should work like an actual magic link flow. We will use Convex auth to implement that. It has a feature for implementing it. Look at the docs at: https://labs.convex.dev/auth/config/email

Resend as the provider
