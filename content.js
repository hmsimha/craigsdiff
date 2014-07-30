/**
 * Craigsdiff
 *
 * Copyright 2014 Hart Simha
 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//The following function is modified from diff_prettyHTML in gdiff.js.
function html_report(diffs) {
  var html = [];
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];    // Operation (insert, delete, equal)
    var data = diffs[x][1];  // Text of change.
    var text = data;
    switch (op) {
      case DIFF_INSERT:
        html[x] = '<ins style="background:#aaffaa;text-decoration:none;">' + text.replace(/<br>/g, '&para;<br>') + '</ins>';
        break;
      case DIFF_DELETE:
        html[x] = '<del style="background:#f7c8c8;text-decoration:none;">' + text.replace(/<br>/g, '&para;') + '</del>';
        break;
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>';
        break;
    }
  }
  return html.join('');
};


function smartPatch(diff) {
  //returns a compressed string representation of a patch
  var x, len, patch = "", int2glyph;
  for (x = 0, len = diff.length; x < len; x++) {
    int2glyph = String.fromCharCode(diff[x][1].length);
    if (diff[x+1] && (diff[x][0] === -diff[x+1][0]) && (diff[x][1].length === diff[x+1][1].length)) {
      patch += 'x' + int2glyph + diff[x+1][1];
      x++;
    }
    else if (diff[x][0] === -1) {
      patch += '-' + int2glyph;
    }
    else if (diff[x][0] === 0) {
      patch += '_' + int2glyph;
    }
    else {
      patch += '+' + int2glyph + diff[x][1];
    };
  };
  return patch;
};

function smartPatch_apply(text1, smart_patch) {
  //reconstructs diff from smartpatch
  var newchars, op, text_cursor, patch_cursor, len = smart_patch.length, text2 = "", glyph2int;
  if (!smart_patch) return text1; //returns original text if given "", undefined, or other falsy values
  for (text_cursor = patch_cursor = 0; patch_cursor < len; patch_cursor += 2) {
    op = smart_patch[patch_cursor];
    glyph2int = smart_patch[patch_cursor+1].charCodeAt(0);
    if (op === '<') {
      text_cursor = 0;
      patch_cursor -= 1;
      text1 = text2;
      text2 = '';
    }
    else if (op === 'x' || op === '+') {
      newchars = smart_patch.substr(patch_cursor+2, glyph2int);
      text2 += newchars;
      if (op === 'x') (text_cursor += glyph2int);
      patch_cursor += glyph2int;
    }
    else {
      if (op === '_') {
        newchars = text1.substr(text_cursor, glyph2int);
        text2 += newchars;
      }
      text_cursor += glyph2int;
    };
  };
  return text2;
};

function reconstructFullTexts(postData) {
  var fullTexts = []
  for (var x = 0, len = postData.length; x < len; x++) {
    if postData[x].hasOwnProperty('txt')) fullTexts.push(postData[x].txt);
    else fullTexts.push(smartPatch_apply(fullTexts[x-1], postData[x].patch));
  }
  return fullTexts;
}

function dateFmt(d) {
  return (new Date(d)).toTimeString().replace(/( GMT-[\d]+)|\(|\)/g, '');
}

function toggleDiff()
{
  postingbody.innerHTML = html_report(diff);
  indicator.onclick = function() {
    postingbody.innerHTML = currentText;
    indicator.onclick = toggleDiff;
  }
}

var indicator = document.createElement("div");
indicator.textContent = String.fromCharCode(8226);
indicator.style.cssText = "position: fixed; font-size: 100px; color: grey; bottom: 0px; right: 0px; line-height: 40px;";
var craigsdiff, lscd = "_craigsdiff_chrome_extension"
localStorage.getItem(lscd) ?
  craigsdiff = JSON.parse(localStorage.getItem(lscd)) :
  craigsdiff =  {}
document.body.appendChild(indicator); 
var postinginfo = document.querySelectorAll(".postinginfo")[1];
var postingbody = document.getElementById("postingbody");
for (var x = 0, links = postingbody.querySelectorAll("a.showcontact"); x < links.length; x++) {links[x].click();}
var currentText = postingbody.innerHTML.replace(/\s{2,}/g, ' ');
var id = postinginfo.textContent.replace(/\D/g, '');
if (id && (id.length > 3) && (postinginfo.outerHTML.indexOf(id) > -1)) {
  var postData= craigsdiff[id];

  if (postData) {
    var fullTexts = reconstructFullTexts(postData), len = postData.length;
    if (currentText !== fullTexts[len-1]) { //the listing has changed
      indicator.style.color = "red";
      indicator.title = "Tracked on " + dateFmt(postData[len-1].date) +
        ".\n**new changes observed.**\n(click to view)";
      fullTexts.push(currentText);
      len++;
      var dmp = new diff_match_patch(), diff = dmp.diff_main(fullTexts[len-2], fullTexts[len-1], false),
        newobj = {date: Date.now()}, patch =smartPatch(diff);
      if (patch.length < currentText.length) newobj.patch = patch;
      else newobj.txt = currentText;
      craigsdiff[id].push(newobj);
      localStorage.setItem(lscd, JSON.stringify(craigsdiff));
      indicator.onclick = toggleDiff;
      indicator.style.cursor = 'pointer';
    }
    else {
      indicator.style.color = "green";
      indicator.title = 
        "Tracked on " + dateFmt(postData[0].date) + ".\nLast edit seen on " + dateFmt(postData[len-1].date);
    }
  }
  else { //listing is currently not being tracked;
    indicator.style.color = "gray";
    indicator.title = "Listing not currently tracked.\n(click to start tracking)";
    indicator.style.cursor = 'pointer';
    indicator.onclick = beginTracking;
  }
  
}

function beginTracking() //postData needs to be created in localStorage for this posting ID
{
  var postData= [{}]
  postData[0].txt = currentText;
  postData[0].date = Date.now();
  indicator.style.color = "green";
  craigsdiff[id] = postData;
  localStorage.setItem(lscd, JSON.stringify(craigsdiff));
}