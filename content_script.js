// The background page is asking us to get the URL on the page.
if (window == top) {
  chrome.extension.onRequest.addListener(function(req, sender, sendResponse) {
    if (req.action == 'getUrl') {
      sendResponse(document.URL);
    } else if (req.action == 'changeUrl') {
      if (req.data) {
        window.open(req.data, '_self');
      }
    }
  });
}
