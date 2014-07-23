var articles = {};
var selectedArticle = null;
var selectedId = null;
//var appUrl = 'http://localhost/';
//var appUrlPattern = '*://localhost/*';
var appUrl = 'http://iamchucky.github.io/PttChrome/';
var appUrlPattern = '*://iamchucky.github.io/PttChrome/*';

var updateArticle = function(tabId) {
  chrome.tabs.sendRequest(tabId, { action: 'getUrl' }, function(url) {
    var article = findArticle(url);

    articles[tabId] = article;
    if (!article) {
      chrome.pageAction.hide(tabId);
    } else {
      chrome.pageAction.show(tabId);
      if (selectedId == tabId) {
        updateSelected(tabId);
      }
    }
  });
};

var i18n = function(name) {
  return chrome.i18n.getMessage(name);
};

var updateSelected = function(tabId) {
  selectedArticle = articles[tabId];
  if (selectedArticle) {
    var board = selectedArticle.board;
    var aid = selectedArticle.articleId;
    if (aid == undefined) {
      chrome.pageAction.setTitle({tabId:tabId, title: i18n('openBoardTitle')});
    } else {
      chrome.pageAction.setTitle({tabId:tabId, title: i18n('openArticleTitle')});
    }
  }
}

var getContextClickHandler = function() {
  return function(info, tab) {
    var url = info.linkUrl;
    var article = findArticle(url);
    if (article) {
      var board = article.board;
      var aid = article.articleId;
      var url = appUrl + '?site=ptt.cc&board='+board+ ((aid == undefined) ? '' : '&aid='+aid);
      // query for opened pttchrome
      chrome.tabs.query({ url:appUrlPattern }, function(tabs) {
        if (tabs.length == 0) {
          chrome.tabs.create({ url: url });
        } else {
          // send command
          chrome.tabs.sendMessage(tabs[0].id, { action: 'navigate', data: { board: board, aid: aid } });
        }
      });
    }
  };
};

chrome.contextMenus.create({
  "title": i18n('openLinkTitle'),
  "type": "normal",
  "contexts": ["link"],
  "targetUrlPatterns": ["*://www.ptt.cc/bbs/*"],
  "onclick": getContextClickHandler()
});

// Called when the user clicks on the page action.
chrome.pageAction.onClicked.addListener(function(tab) {
  var article = selectedArticle;
  if (article) {
    var board = article.board;
    var aid = article.articleId;
    var url = appUrl + '?site=ptt.cc&board='+board+ ((aid == undefined) ? '' : '&aid='+aid);

    // query for opened pttchrome
    chrome.tabs.query({ url:appUrlPattern }, function(tabs) {
      if (tabs.length == 0) {
        chrome.tabs.sendRequest(tab.id, { action: 'changeUrl', data: url });
      } else {
        // send command
        chrome.tabs.sendMessage(tabs[0].id, { action: 'navigate', data: { board: board, aid: aid } });
      }
    });
  }
});

chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
  if (change.status == "complete") {
    updateArticle(tabId);
  }
});

chrome.tabs.onSelectionChanged.addListener(function(tabId, info) {
  selectedId = tabId;
  updateSelected(tabId);
});

// Ensure the current selected tab is set up.
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  updateArticle(tabs[0].id);
});

// Get the article id and board from the URL.
// Return null if none is found.
var findArticle = function(url) {
  // convert to board and article id
  var regex = new RegExp(/http[s]?:\/\/www.ptt.cc\/bbs\/([\w_-]+)\/(index|[G,M].\d{10}.A.[\d,A-F]{3}).html/g);
  var result = regex.exec(url);
  if (result && result.length == 3) {
    var aid = null;
    if (result[2] == 'index') {
      return { board: result[1] };
    }

    aid = fn2aid(result[2]);
    if (aid === null) {
      return null;
    }
    return { board: result[1], articleId: aid };
  }
  return null;
}

// Convert from PTT web article URL to aid
// Reference from http://opensvn.csie.org/pttbbs/trunk/pttbbs/mbbsd/aids.c
var fn2aid = function(fn) {
  var aidu = [];
  var type = 0;
  var v1 = 0;
  var v2 = 0;

  var fnSplit = fn.split('.');
  if (fnSplit.length < 3) 
    return null;

  switch(fnSplit[0]) {
    case 'M':
      type = 0;
      break;
    case 'G':
      type = 1;
      break;
    default:
      return null;
      break;
  }

  v1 = parseInt(fnSplit[1], 10);  // base 10
  if (v1 === undefined)
    return null;

  if (fnSplit[2] != 'A')
    return null;

  if (fnSplit.length == 4) {
    v2 = parseInt(fnSplit[3], 16);  // base 16
    if (v2 === undefined)
      return null;
  }

  // make it into arrays separate by mod 64
  aidu.push((v2 & 0x3f));
  v2 = v2 >> 6;
  aidu.push((v2 & 0x3f));
  for (var i = 0; i < 5; ++i) {
    aidu.push((v1 & 0x3f));
    v1 = v1 >> 6;
  }
  aidu.push((type & 0xf) << 2 | (v1 & 0x3));

  var aidu2aidcTable = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  var output = [];
  for (var i = 0; i < 8; ++i) {
    output.push(aidu2aidcTable[aidu[i]]);
  }

  return output.reverse().join('');
};

