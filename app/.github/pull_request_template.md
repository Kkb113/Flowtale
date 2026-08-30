
Write description if applicable

---

## Answer the following questions

### What's the source of the issue?

- Is it from sentry? [yes, here is the link to sentry issue](...) / no
- Is it from slack? [yes, here is the link to slack thread](...) / no
- Does it have whimsical details? [yes, here is the link to slack thread](...) / no
- Does it have exalidraw details?  [yes, here is the image](...) / no
- Others

If others write issue details with screenshot / loom if applicable.

### Sample fable demo link

Link of a Fable demo where the issue is replicated and fixed. The demo must be created in sharefable.com account in staging. 

[demo link embedded in jsffiddle](https://jsfiddle.net/...) 

### How to test it?

[loom video](...) / [screnshots](...) / text description / na

## Thing to answer with yes/na

If the answer is _yes_ checkbox the checkbox; if it's _na_, don't check the chebox but write _na_ after the question

- [ ] If the fix touches extension, is backward compatibility tested with previous version?
- [ ] If the fix touches extension / serialization and deserialization of DOM have we checked with amplitude, sentry, github, google analytics, google sheet?
- [ ] Is the functional testing of the feature is done?

# Testing process

While all development & testing — keep devtools open always

- Check if same assets (js / data files / etc) are getting called multiple times or not
- errors / warnings in console

General testing plan for staging release. — Once prs are merged to staging perform the following plan religiously by whoever’s issues are getting merged.  

Each person create one demo. Add modules to the demo for each of the following product when it gets recorded.

- If you have any major issues — go ahead and fix it.
- if you have minor issues — discuss with siddhi / akash and raise a github issue with the demo link

1. Record the following websites that has mix of same origin + cross origin iframes + object
- App: https://www.biztags.co.uk/ — Username: davwez@gmail.com — Password: password
- google sheets with calendar open on the right side — cross origin
- amplitude with intercom bot open — same origin
- Create a page that would have multiple level of nested dom testing
  - Create 3/4 buttons on the top of the root frame on click of the button dufferent nesting of iframe + object would be created
  - root (lh:8080/a) > same origin frame (lh: 8080/b) > cross origin frame (lh:8081/c) > same origin frame (lh: 8081/d)
  - root > cross origin frame > cross origin frame > same origin frame
  - root > object > corss origin iframe > object > same origin iframe
  - root > object > corss origin > object > cross origin
  - [later] — add custom components in each of the iframe for our custom component implementation testing

2. Editing the demo
  - add a new image screen and annotation on top  +
  - canvas connection + reordering
  - Advanced element picker

3. Integration testing -- is the lead form data going to integrations
4. Publish testing
5. ⛔️⛔️⛔️ Embed the demo inside a codepen / jsfiddle and see if the demo is working


While sending a pr, test affected region. But before you send a pr 
- you should always test 5 & backward compatibility
- if your code touches editing demo & tx (annotation creator panel, canvas editing), test by increasing chunk-sync-manager timeout, and with slow/fast 3g & test 2
- if your code touches serialization / deserialization of html, test 1, 2
- if your code touches leadform / analytics / integration, test 3
