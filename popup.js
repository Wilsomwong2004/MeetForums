document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.sync.get('chatSpaceId', function(data) {
      if (data.chatSpaceId) {
        document.getElementById('spaceId').value = data.chatSpaceId;
      }
    });
  
    document.getElementById('saveSpaceId').addEventListener('click', function() {
      var spaceId = document.getElementById('spaceId').value;
      chrome.storage.sync.set({chatSpaceId: spaceId}, function() {
        alert('Space ID saved!');
      });
    });
  
    document.getElementById('clearMessages').addEventListener('click', function() {
      chrome.storage.sync.set({forumMessages: []}, function() {
        alert('All messages have been cleared.');
      });
    });
  });