// User-facing English strings. Product copy is verbatim from the handover boards (canvas/*.dc.html) and the
// web reference components; the board ID is noted where it comes from a board.
export const en = {
  'app.name': 'Nano Beauty',

  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.dismiss': 'Dismiss',
  'common.loading': 'Loading',

  'error.title': 'Something went wrong',
  'error.body': 'Please try again.',
  'error.retry': 'Try again',

  // Main (HOM-01) offline / oldlink states
  'offline.title': 'You’re offline',
  'offline.banner': 'You’re offline. Some information may be out of date.',
  'link.notFound.title': 'Link not found',
  'link.notFound.body': 'That link is old or no longer available, so we brought you Home.',

  // TabBar (D28) and Home actions (Main)
  'tab.home': 'Home',
  'tab.treatments': 'Treatments',
  'tab.visits': 'Visits',
  'tab.wallet': 'Wallet',
  'tab.new': 'New',
  'nav.account': 'Account',
  'home.book': 'Book appointment',
  'home.explore': 'Explore treatments',

  // ENT-02
  'ent.update.title': 'Time for an update',
  'ent.update.body': 'This version of Nano Beauty is no longer supported. Update to keep booking and managing your visits.',
  'ent.update.action': 'Update now',
  'ent.callClinic': 'Call the clinic',
  // ENT-03 (time comes from the server's maintenance window)
  'ent.maintenance.title': 'Back shortly',
  'ent.maintenance.body': "We're improving the app until about {time} {zone}. Your visits are unaffected. To change one now, call or text the clinic.",
  // ENT-04
  'ent.primer.title': 'Get reminded before your visit',
  'ent.primer.body': "We'll send a reminder the day before and your preparation steps. Offers stay off unless you choose them.",
  'ent.primer.turnOn': 'Turn on reminders',
  'ent.primer.notNow': 'Not now',

  // Component built-ins (web reference bundle)
  'badge.sample': 'Sample',
  'field.optional': '(optional)',
  'switch.alwaysOn': 'Always on',
  'async.reference': 'Reference {reference}',
  'photo.pending': 'Clinic photo pending',
  'price.from': 'From',
  'price.rangeNote': 'Final price confirmed at consultation',
  'price.consultation': 'Consultation required',
  'price.consultationNote': 'Price set after your assessment',
  'price.promoLabel': '{price}, was {was}',
  'price.offerEnds': 'Offer ends {endsAt}',
  'confirm.archive.title': 'Archive {item}?',
  'confirm.archive.verb': 'Archive',
  'confirm.archive.body': 'Customers stop seeing it. You can restore it any time.',
  'confirm.delete.title': 'Delete draft {item}?',
  'confirm.delete.verb': 'Delete',
  'confirm.delete.body': 'This draft was never live. It will be deleted for good.',
  'confirm.restore.title': 'Restore {item}?',
  'confirm.restore.verb': 'Restore',
  'confirm.restore.body': 'It comes back as a draft. Publish it again when it is ready.',
  'confirm.audit': 'This is recorded in the audit log.',
  'staff.workspace': 'Staff workspace',
  'staff.envLabel': 'Environment: {env}',
  'staff.signedInAs': 'Signed in as {role}',
  'permission.title': 'You can’t do this yet',
  'permission.ask': 'Ask an admin',
  'permission.body': 'Your role ({role}) can’t {action}. An administrator can change your access; the server checks this too.',

  // Development-only placeholders for routes later prompts build. Never shown as product copy.
  'placeholder.title': 'Not built yet',
  'placeholder.body': '{screen} is built in {prompt}.',
  'dev.showcase': 'Component showcase',
} as const;
