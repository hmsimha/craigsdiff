#Craigsdiff
Track changes to listings on Craigslist

Chrome extension that enables users to track and observe changes to listings on Craigslist.

The javascript library that detects changes utilizes google's diff_match_patch in character mode. The changes are stored
in localStorage as nonstandard patches that utilize less space than those generated by diff_match_patch (and are generated as
a transformation of unified foratted diffs)

This extension is intended to have no dependencies (aside from a Chrome browser)