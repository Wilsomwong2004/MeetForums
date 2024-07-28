// 全局变量
let currentMeetingId = null;
let currentForumId = null;
let isModerator = false; // 默认为false,需要根据实际情况设置
let currentView = 'forumList';
let lastOpenedForumId = null;
let currentlyDisplayedContainer = null;
let hasLiked = false; // Variable to track if the user has liked 
let hasDisliked = false; // Variable to track if the user has disliked 

// 检查用户是否为主持人
function checkModeratorStatus() {
  const hostControls = document.querySelector('[aria-label="Host controls"]');
  isModerator = !!hostControls;
  console.log('Moderator status:', isModerator);

  // 只有当设置页面存在时才更新
  if (document.getElementById('forum-settings-page')) {
    updateSettingsPageForModeratorStatus();
  }
}

// 定义可能的聊天按钮选择器
const CHAT_BUTTON_SELECTORS = [
  'button[aria-label="Chat"]',
  'button[title="Chat"]',
  'button[data-tooltip="Chat"]',
  'button[aria-label="Chat with everyone"]',  
  'button[data-is-muted]'
  // 添加更多可能的选择器
];

// 检查会议状态
function checkMeetingStatus() {
  const meetingIdElement = document.querySelector('[data-meeting-id], [data-unresolved-meeting-id]');
  if (meetingIdElement) {
    const newMeetingId = meetingIdElement.getAttribute('data-meeting-id') || meetingIdElement.getAttribute('data-unresolved-meeting-id');
    if (newMeetingId !== currentMeetingId) {
      currentMeetingId = newMeetingId;
      console.log('New meeting started:', currentMeetingId);
      // 清除之前的消息
      if (chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.remove('forumMessages');
      }
    }
  } else {
    console.log('No meeting found. Waiting for meeting to start...');
    currentMeetingId = null;
  }
}

// 使用MutationObserver持续监视DOM变化
const observer = new MutationObserver(() => {
  checkAndAddForumButton();
  checkMeetingStatus();
  checkModeratorStatus();
});

// 开始观察
observer.observe(document.body, {
  childList: true,
  subtree: true
});

function logError(message, error) {
  console.error(`[Forum Extension Error] ${message}`, error);
}

// 定期检查是否可以添加论坛按钮
function checkAndAddForumButton() {
  if (!document.getElementById('forum-button')) {
    const chatButton = findChatButton();
    if (chatButton) {
      addForumButton(chatButton);
    } else {
      console.log('Chat button not found, will try again...');
    }
  }
}

// 查找聊天按钮
function findChatButton() {
  for (let selector of CHAT_BUTTON_SELECTORS) {
    const button = document.querySelector(selector);
    if (button) {
      console.log('Chat button found with selector:', selector);
      return button;
    }
  }
  return null;
}

// 添加论坛按钮
function addForumButton(chatButton) {
  if (!chatButton || !chatButton.parentNode) {
    logError('Chat button or its parent node not found');
    return;
  }
  
  if (document.getElementById('forum-button')) {
    console.log('Forum button already exists');
    return;
  }

  try {
    const forumButton = document.createElement('button');
    forumButton.id = 'forum-button';
    forumButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#e8eaed"><path d="M0 0h24v24H0z" fill="none"/><path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/></svg>';
    forumButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      color: white;
    `;
    forumButton.onclick = toggleForumList;
    chatButton.parentNode.insertBefore(forumButton, chatButton.nextSibling);
    console.log('Forum button added successfully');
  } catch (error) {
    logError('Error adding forum button:', error);
  }
}

// 创建论坛列表容器
async function createForumListContainer() {
  console.log('正在创建论坛列表容器');
  const existingContainer = document.getElementById('forum-list-container');
  if (existingContainer) {
    console.log('论坛列表容器已存在');
    return existingContainer;
  }

  const forumListContainer = document.createElement('div');
forumListContainer.id = 'forum-list-container';
forumListContainer.className = 'forum-list-container';

forumListContainer.innerHTML = `
  <div class="forum-list-header">
    <h2 class="forum-list-title">Forums</h2>
    <div class="forum-list-controls">
     <svg id="forum-settings" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#e8eaed"><g><path d="M0,0h24v24H0V0z" fill="none"/><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></g></svg>
      <svg id="forum-list-close" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#e8eaed"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </div>
  </div>
  <div id="forum-list" class="forum-list">
    <div class="no-forums-message">No Forums Available</div>
  </div>
  <button id="create-forum-button" class="create-forum-button">Create new forum</button>
`;

document.body.appendChild(forumListContainer);
console.log('论坛列表容器已添加到body');

// 使用 setTimeout 来确保 DOM 已经更新
setTimeout(() => {
  const settingsIcon = document.getElementById('forum-settings');
  const closeIcon = document.getElementById('forum-list-close');

  if (settingsIcon) {
    settingsIcon.addEventListener('click', openSettings);
  } else {
    console.error('无法找到设置图标');
  }

  if (closeIcon) {
    closeIcon.addEventListener('click', closeForumList);
  } else {
    console.error('无法找到关闭图标');
  }
}, 0);

document.getElementById('create-forum-button').addEventListener('click', createNewForum);
await loadForumList();
return forumListContainer;
}

// 关闭论坛列表
function closeForumList() {
  console.log('关闭论坛列表');
  const forumListContainer = document.getElementById('forum-list-container');
  /*forumListContainer.style.animation = 'slideOut 0.5s forwards';*/ // 这里有问题会把它卡回去
// 打开论坛列表
  if (forumListContainer) {
    forumListContainer.style.display = 'none';
    currentlyDisplayedContainer = null;
  }
}

function openSettings() {
  console.log('打开设置');
  openSettingsPage();
}

// 创建设置页面
function createSettingsPage() {
  const settingsContainer = document.createElement('div');
  settingsContainer.id = 'forum-settings-page';
  settingsContainer.className = 'forum-settings-page';
  settingsContainer.innerHTML = `
    <div class="settings-header">
      <h2>Forum Settings</h2>
      <span class="close-settings">&times;</span>
    </div>
    <div class="settings-content">
      <div id="moderator-settings">
        <label class="allow-create-forums">
          <input type="checkbox" id="allow-create-forums"> Allow everybody to create forums
        </label>
      </div>
      <div id="non-moderator-message" style="display: none;">
        You need to be a moderator to access these settings.
      </div>
    </div>
  `;
  document.body.appendChild(settingsContainer);

  // 添加事件监听器
  document.querySelector('.close-settings').addEventListener('click', closeSettingsPage);
  document.getElementById('allow-create-forums').addEventListener('change', toggleAllowCreateForums);

  // 检查主持人状态并更新设置页面
  updateSettingsPageForModeratorStatus();
}

// 打开设置页面
function openSettingsPage() {
  const settingsPage = document.getElementById('forum-settings-page');
  if (!settingsPage) {
    createSettingsPage();
  } else {
    settingsPage.style.display = 'block';
  }
  updateSettingsPageForModeratorStatus();
}

// 关闭设置页面
function closeSettingsPage() {
  const settingsPage = document.getElementById('forum-settings-page');
  if (settingsPage) {
    settingsPage.style.display = 'none';
  }
}

// 根据主持人状态更新设置页面
function updateSettingsPageForModeratorStatus() {
  const moderatorSettings = document.getElementById('moderator-settings');
  const nonModeratorMessage = document.getElementById('non-moderator-message');
  
  if (!moderatorSettings || !nonModeratorMessage) {
    console.log('Settings page elements not found. Skipping update.');
    return;
  }

  if (isModerator) {
    moderatorSettings.style.display = 'block';
    nonModeratorMessage.style.display = 'none';
    
    // 从存储中获取设置并设置复选框状态
    chrome.storage.sync.get('allowAnyoneCreateForum', (data) => {
      const allowCreateForumsCheckbox = document.getElementById('allow-create-forums');
      if (allowCreateForumsCheckbox) {
        allowCreateForumsCheckbox.checked = data.allowAnyoneCreateForum || false;
      }
    });
  } else {
    moderatorSettings.style.display = 'none';
    nonModeratorMessage.style.display = 'block';
  }
}

// 创建论坛框内容
async function createForumContent(forumId) {
  const forum = await getForum(forumId);
  const forumContent = document.createElement('div');
  forumContent.className = 'forum-content';
  forumContent.innerHTML = `
    <div class="forum-header">
      <div class="forum-title-date">
        <h2 class="forum-title">${forum.title}</h2>
        <span class="forum-date">${forum.date}</span>
      </div>
      <div class="forum-description">${forum.description}</div>
      <button class="back-button" onclick="toggleForumListVisibility()">Back</button>
    </div>
    <div class="forum-body">
      <div class="forum-replies">
        <h3 class="forum-replies-title">Replies</h3>
        <div class="forum-replies-list"></div>
      </div>
      <div class="forum-reply-area">
        <textarea class="forum-reply-input" placeholder="Write a reply..."></textarea>
        <button class="forum-reply-button" onclick="replyToForum('${forumId}')">Reply</button>
      </div>
    </div>
  `;
  return forumContent;
}

function createForumItem(forum) {  
  const forumItem = document.createElement('div');  
  forumItem.className = 'forum-item';  
  forumItem.id = `forum-item-${forum.id}`;  

  const truncatedTitle = truncateText(forum.title, 30);  
  const truncatedDescription = truncateText(forum.description, 100);  

  forumItem.innerHTML = `  
    <div class="forum-item-header">  
      <span class="forum-item-title">${truncatedTitle}</span>  
      <span class="forum-item-close">×</span>  
    </div>  
    <div class="forum-item-description">${truncatedDescription}</div>  
    <div class="forum-item-footer">  
      <span class="forum-item-info">${forum.creatorName} • ${forum.createdAt}</span>  
      <div class="forum-item-actions">  
        <span class="forum-item-like">👍 <span class="like-count">${forum.likes || 0}</span></span>  
        <span class="forum-item-dislike">👎 <span class="dislike-count">${forum.dislikes || 0}</span></span>  
      </div>  
    </div>  
  `;  

  let deleteTimer;  
  let deleteAnimation;  

  forumItem.ontouchstart = forumItem.onmousedown = () => {  
    deleteTimer = setTimeout(() => {  
      forumItem.style.position = 'relative';  
      deleteAnimation = forumItem.appendChild(createDeleteAnimation());  
    }, 3000);  
  };  

  forumItem.ontouchend = forumItem.onmouseup = () => {  
    clearTimeout(deleteTimer);  
    if (deleteAnimation) {  
      deleteAnimation.remove();  
      forumItem.style.position = '';  
    }  
  };  

  // 添加点赞和踩的功能  
  const likeButton = forumItem.querySelector('.forum-item-like');  
  const dislikeButton = forumItem.querySelector('.forum-item-dislike');  
  
  likeButton.onclick = () => updateLikeCount(forum.id, 'like');  
  dislikeButton.onclick = () => updateLikeCount(forum.id, 'dislike');  

  // 添加删除功能  
  const closeButton = forumItem.querySelector('.forum-item-close');  
  closeButton.onclick = () => deleteForum(forum.id);  

  animation.ontouchend = animation.onclick = async (e) => {
    e.stopPropagation();
    await deleteForum(forumItem.id.split('-')[2]);
  };

  return forumItem;  
}  

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

function createDeleteAnimation() {
  const animation = document.createElement('div');
  animation.className = 'delete-animation';
  animation.innerHTML = `
    <div class="delete-background"></div>
    <svg class="delete-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24px" height="24px">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  `;
  animation.ontouchend = animation.onclick = (e) => {
    e.stopPropagation();
    deleteForum(forumItem.id.split('-')[2]);
  };
  return animation;
}

// 创建详细页面内容
function createDetailView(forum) {
  const detailView = document.createElement('div');
  detailView.className = 'forum-detail';

  detailView.innerHTML = `
    <div class="detail-header">
      <span class="detail-title">${forum.title}</span>
      <span class="detail-date">${forum.createdAt}</span>
    </div>
    <div class="detail-description">${forum.description}</div>
    <div class="detail-footer">
      <span class="detail-replies">
        <span class="detail-replies-icon">💬</span>
        ${forum.repliesCount} Replies
      </span>
    </div>
    <div class="detail-reply-area">
      <!-- 回复区域 -->
    </div>
  `;
  return detailView;
}

async function updateLikeCount(forumId, action) {
  const forums = await getStoredForums();
  const forumIndex = forums.findIndex(f => f.id === forumId);
  
  if (forumIndex === -1) return;

  const forum = forums[forumIndex];
  if (!forum.likes) forum.likes = 0;
  if (!forum.dislikes) forum.dislikes = 0;

  if (action === 'like') {
    forum.likes++;
  } else if (action === 'dislike') {
    forum.dislikes++;
  }

  forums[forumIndex] = forum;
  await chrome.storage.sync.set({ forums: forums });

  // 更新 UI
  const forumItem = document.getElementById(`forum-item-${forumId}`);
  if (forumItem) {
    const likeCount = forumItem.querySelector('.like-count');
    const dislikeCount = forumItem.querySelector('.dislike-count');
    if (likeCount) likeCount.textContent = forum.likes;
    if (dislikeCount) dislikeCount.textContent = forum.dislikes;
  }
}

function updateModeratorControls() {
  const moderatorControls = document.getElementById('moderator-controls');
  if (!moderatorControls) return;

  if (isModerator) {
    moderatorControls.innerHTML = `
      <button id="create-forum-button" class="create-forum-button">Create New Forum</button>
      <label class="allow-create-forum"><input type="checkbox" id="allow-create-forum"> Allow anyone to create forums</label>
    `;
    document.getElementById('create-forum-button').onclick = createNewForum;
    document.getElementById('allow-create-forum').onchange = toggleAllowCreateForum;
  } else {
    moderatorControls.innerHTML = ''; // 非主持人不显示任何控制选项
  }
}

async function loadForumList() {
  const forumList = await getStoredForums();
  const forumListElement = document.getElementById('forum-list');
  if (!forumListElement) return;

  forumListElement.innerHTML = '';
  if (forumList.length === 0) {
    const noForumsMessage = document.createElement('div');
    noForumsMessage.className = 'no-forums-message';
    noForumsMessage.textContent = 'No Forums Available';
    forumListElement.appendChild(noForumsMessage);
  } else {
    forumList.forEach(forum => {
      const forumElement = document.createElement('div');
      forumElement.className = 'forum-item';
      forumElement.id = `forum-item-${forum.id}`;
      forumElement.innerHTML = `
        <div class="forum-title">${forum.name}</div>
        <div class="forum-description">${forum.description || ''}</div>
        <button class="delete-forum" data-id="${forum.id}">×</button>
      `;
      forumElement.querySelector('.delete-forum').onclick = async (e) => {
        e.stopPropagation();
        await deleteForum(forum.id);
      };
      forumElement.onclick = () => openForum(forum.id);
      forumListElement.appendChild(forumElement);
    });
  }
}

// 删除论坛
async function deleteForum(forumId) {
  const forumItem = document.getElementById(`forum-item-${forumId}`);
  
  if (!forumItem) {
    console.error(`找不到ID为 ${forumId} 的论坛项`);
    return;
  }

  if (confirm('确定要删除这个论坛吗？')) {
    forumItem.style.animation = 'smash 0.5s forwards';
    
    setTimeout(async () => {
      let forums = await getStoredForums();
      forums = forums.filter(forum => forum.id !== forumId);
      await chrome.storage.sync.set({ forums: forums });
      await loadForumList();
    }, 500);
  }
}

/* 论坛消息相关 */
function toggleForumListVisibility() {
  const forumListContainer = document.getElementById('forum-list-container');
  if (forumListContainer) {
    forumListContainer.style.display = forumListContainer.style.display === 'none' ? 'block' : 'none';
  } else {
    createForumListContainer();
  }
}

async function createNewForum() {
  const name = prompt('输入论坛名称:');
  const description = prompt('输入论坛描述:');
  if (name) {
    const forumId = 'forum_' + Date.now();
    await saveForum({ id: forumId, name: name, description: description });
    await loadForumList();
  }
}

async function openForum(forumId) {
  currentForumId = forumId;
  lastOpenedForumId = forumId;
  currentView = 'forum';
  const forumListContainer = document.getElementById('forum-list-container');
  let forumContainer = document.getElementById('forum-container');
  
  if (!forumContainer) {
    forumContainer = createForumContainer();
  }

  const forumTitle = document.getElementById('forum-title');
  const forumDescription = document.getElementById('forum-description');
  const forums = await getStoredForums();
  const currentForum = forums.find(f => f.id === forumId);
  
  if (forumTitle && forumDescription && currentForum) {
    forumTitle.textContent = currentForum.name;
    forumDescription.textContent = currentForum.description || '无描述';
  }
  
  if (forumListContainer) forumListContainer.style.display = 'none';
  if (forumContainer) forumContainer.style.display = 'block';
  
  const forumListContainerAgain = document.getElementById('forum-list-container');
  if (forumListContainerAgain) forumListContainerAgain.style.display = 'none';
  
  currentlyDisplayedContainer = 'forum';
  loadAndDisplayMessages();
}

function createForumContainer() {  
  const forumContainer = document.createElement('div');  
  forumContainer.id = 'forum-container';  
  forumContainer.className = 'forum-container';  
  forumContainer.innerHTML = `  
    <div id="forum-container" class="forum-container">  
      <div class="forum-header">  
        <div class="forum-title-description">  
          <h2 id="forum-title" class="forum-title">Forum Title</h2>  
        </div>  
        <span id="close-forum" class="forum-close">&times;</span>  
      </div>  
      <div class="forum-content">  
        <div class="forum-content-title-description">  
          <h2 id="forum-inside-title" class="forum-title"></h2>  
          <p id="forum-inside-description" class="forum-description"></p>  
          <p id="forum-inside-username" class="forum-username"><span id="forum-username">UserName</span> • <span id="forum-date">2023-10-01</span></p>  
          <div class="forum-item-actions">  
            <span class="forum-item-like" id="like-button">👍 <span class="like-count" id="forum-likes">0</span></span>  
            <span class="forum-item-dislike" id="dislike-button">👎 <span class="dislike-count" id="forum-dislikes">0</span></span>  
          </div>  
        </div>  
        <div id="forum-messages" class="forum-messages"></div>  
        <div class="forum-input-container">  
          <input type="text" id="forum-input" class="forum-input" placeholder="Enter message...">  
          <input type="file" id="forum-file-input" style="display: none;">  
          <button id="forum-file-button" class="forum-file-button">📎</button>  
          <button id="forum-send" class="forum-send">Send</button>  
        </div>  
      </div>  
    </div>  
  `;  
  document.body.appendChild(forumContainer);  

  document.getElementById('forum-send').onclick = sendForumMessage;  
  document.getElementById('forum-input').onkeypress = function(e) {  
    if (e.key === 'Enter') sendForumMessage();  
  };  
  document.getElementById('forum-file-button').onclick = () => document.getElementById('forum-file-input').click();  
  document.getElementById('forum-file-input').onchange = handleFileUpload;  
  document.getElementById('close-forum').onclick = () => {  
    document.getElementById('forum-container').style.display = 'none';  
    document.getElementById('forum-list-container').style.display = 'block';  
    currentlyDisplayedContainer = 'list';  
  };  

  // Add event listener for like button  
  document.getElementById('like-button').onclick = () => {  
    if (!hasLiked && !hasDisliked) { // Check if the user has already liked or disliked  
      const likeCountElement = document.getElementById('forum-likes');  
      let likeCount = parseInt(likeCountElement.innerText, 10);  
      likeCount += 1;  
      likeCountElement.innerText = likeCount;  
      hasLiked = true; // Mark as liked  

      // Add animation class  
      document.getElementById('like-button').classList.add('liked-animation');  

      // Remove the animation class after the animation is done  
      setTimeout(() => {  
        document.getElementById('like-button').classList.remove('liked-animation');  
      }, 300); // Duration of the animation  
    }  
  };  

  // Add event listener for dislike button  
  document.getElementById('dislike-button').onclick = () => {  
    if (!hasLiked && !hasDisliked) { // Check if the user has already liked or disliked  
      const dislikeCountElement = document.getElementById('forum-dislikes');  
      let dislikeCount = parseInt(dislikeCountElement.innerText, 10);  
      dislikeCount += 1;  
      dislikeCountElement.innerText = dislikeCount;  
      hasDisliked = true; // Mark as disliked  

      // Add animation class  
      document.getElementById('dislike-button').classList.add('disliked-animation');  

      // Remove the animation class after the animation is done  
      setTimeout(() => {  
        document.getElementById('dislike-button').classList.remove('disliked-animation');  
      }, 300); // Duration of the animation  
    }  
  };  

  // Optional: Animation CSS class for liked and disliked effect  
  const style = document.createElement('style');  
  style.textContent = `  
    .liked-animation {  
      animation: likeAnimation 0.3s ease;  
    }  

    .disliked-animation {  
      animation: dislikeAnimation 0.3s ease;  
    }  

    @keyframes likeAnimation {  
      0% { transform: scale(1); }  
      50% { transform: scale(1.2); }  
      100% { transform: scale(1); }  
    }  

    @keyframes dislikeAnimation {  
      0% { transform: scale(1); }  
      50% { transform: scale(1.2); }  
      100% { transform: scale(1); }  
    }  
  `;  
  document.head.appendChild(style);  
}  

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    // 这里你可以处理文件上传,例如将文件转换为base64或者上传到服务器
    // 为了简单起见,我们这里只显示文件名
    sendForumMessage(file.name);
  }
}

async function loadAndDisplayMessages() {  
  const messages = await getStoredMessages(currentForumId, currentMeetingId);  
  displayForumMessages(messages);  
  
  const forumTitle = document.getElementById('forum-title');  
  const forumInsideTitle = document.getElementById('forum-inside-title');  
  const forumInsideDescription = document.getElementById('forum-inside-description');  
  
  const forums = await getStoredForums();  
  const currentForum = forums.find(f => f.id === currentForumId);  
  if (forumTitle && currentForum) {  
    forumTitle.textContent = currentForum.name;  
    forumInsideTitle.textContent = currentForum.name; // 同步标题  
    forumInsideDescription.textContent = currentForum.description; // 同步描述  
  }  
}  

async function getStoredMessages(forumId, meetingId) {
  if (chrome.storage && chrome.storage.sync) {
    const result = await chrome.storage.sync.get('forumMessages');
    const allMessages = result.forumMessages || {};
    return allMessages[`${forumId}_${meetingId}`] || [];
  } else {
    console.error('chrome.storage.sync is not available');
    return [];
  }
}

// 切换允许创建论坛的设置
async function toggleAllowCreateForums(event) {
  const isAllowed = event.target.checked;
  await chrome.storage.sync.set({ allowAnyoneCreateForum: isAllowed });
  console.log('Allow everyone to create forums:', isAllowed);
}

async function saveForum(forum) {
  const forums = await getStoredForums();
  forums.push(forum);
  await chrome.storage.sync.set({ forums: forums });
}

async function getStoredForums() {
  if (chrome.storage && chrome.storage.sync) {
    const result = await chrome.storage.sync.get('forums');
    return result.forums || [];
  } else {
    console.error('chrome.storage.sync is not available');
    return [];
  }
}

async function sendForumMessage() {
  const input = document.getElementById('forum-input');
  const message = input.value.trim();
  if (message) {
    console.log('Send Message:', message);
    const messages = await getStoredMessages(currentForumId, currentMeetingId);
    const userName = await getUserName();
    messages.push({
      text: message, 
      timestamp: new Date().toISOString(),
      sender: userName
    });
    if (chrome.storage && chrome.storage.sync) {
      const allMessages = await chrome.storage.sync.get('forumMessages');
      allMessages.forumMessages = allMessages.forumMessages || {};
      allMessages.forumMessages[`${currentForumId}_${currentMeetingId}`] = messages;
      await chrome.storage.sync.set(allMessages);
    } else {
      console.error('chrome.storage.sync is not available');
    }
    input.value = '';
    displayForumMessages(messages);
  } else {
    console.log('No message to send');
  }
}

async function getUserName() {  
  // 等待 Google Meet 的 DOM 元素加载  
  await new Promise(resolve => setTimeout(resolve, 1000)); // 你可以根据实际情况调整延迟  

  // 尝试获取用户名的 DOM 元素  
  const nameElement = document.querySelector('.zWGUib'); // 根据实际情况检查类名  
  if (nameElement) {  
    return nameElement.textContent; // 返回用户名  
  }  
  
  // 如果没有找到用户名，返回 "User" 或其他默认值  
  return "User";  
}  

function displayForumMessages(messages) {
  const messagesContainer = document.getElementById('forum-messages');
  if (!messagesContainer) return;

  let html = '';
  let currentDate = null;

  messages.forEach(msg => {
    const messageDate = new Date(msg.timestamp).toLocaleDateString();
    if (messageDate !== currentDate) {
      html += `<div class="forum-date-separator">${messageDate}</div>`;
      currentDate = messageDate;
    }

    html += `
      <div class="forum-message">
        <div class="forum-message-header">
          <span class="forum-message-sender">${msg.sender}</span>
          <span class="forum-message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="forum-message-content">${msg.text}</div>
      </div>
    `;
  });

  messagesContainer.innerHTML = html;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function toggleForum() {
  const forumContainer = document.getElementById('forum-container');
  if (forumContainer) {
    forumContainer.style.display = forumContainer.style.display === 'none' ? 'block' : 'none';
  } else {
    createForumContainer();
  }
}


function toggleForumList() {
  const forumListContainer = document.getElementById('forum-list-container');
  const forumContainer = document.getElementById('forum-container');

  if (!forumListContainer) {
    createForumListContainer();
    currentlyDisplayedContainer = 'list';
    return;
  }

  if (currentlyDisplayedContainer === null) {
    forumListContainer.style.display = 'block';
    currentlyDisplayedContainer = 'list';
  } else {
    forumListContainer.style.display = 'none';
    if (forumContainer) forumContainer.style.display = 'none';
    currentlyDisplayedContainer = null;
  }

  console.log('当前显示状态:', currentlyDisplayedContainer);
}

async function onMeetingEnd(meetingId) {
  console.log('Meeting ended:', meetingId);
  const messages = await getStoredMessages();
  await sendForumRecordsToChat(messages, meetingId);
  
  // Remove forum container
  const forumContainer = document.getElementById('forum-list-container');
  if (forumContainer) {
    forumContainer.remove();
  }
}

async function sendForumRecordsToChat(messages, meetingId) {
  try {
    const response = await chrome.runtime.sendMessage({action: "getAuthToken"});
    if (response.error) {
      console.error('Error getting auth token:', response.error);
      return;
    }
    const token = response.token;
    
    const data = await chrome.storage.sync.get('chatSpaceId');
    const spaceId = data.chatSpaceId;
    
    if (!spaceId) {
      console.error('No Space ID set. Please set a Space ID in the extension popup.');
      return;
    }

    const url = `https://chat.googleapis.com/v1/spaces/${spaceId}/messages`;
    
    const messageBody = {
      text: `Forum records for meeting ${meetingId}:\n${messages.map(msg => `${new Date(msg.timestamp).toLocaleString()}: ${msg.text}`).join('\n')}`
    };

    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody)
    });

    if (!fetchResponse.ok) {
      throw new Error(`HTTP error! status: ${fetchResponse.status}`);
    }

    console.log('Message sent successfully');
  } catch (error) {
    console.error('Error sending message:', error);
  }

  messages.push({
    text: "Meeting ended. Discussion can continue here.",
    timestamp: new Date().toISOString(),
    sender: "System"
  });
  await chrome.storage.sync.set({forumMessages: messages});

  const forums = await getStoredForums();
  let messageBody = `Forum records for meeting ${meetingId}:\n\n`;
  
  for (const forum of forums) {
    const forumMessages = messages[`${forum.id}_${meetingId}`] || [];
    messageBody += `# ${forum.name}\n`;
    forumMessages.forEach(msg => {
      messageBody += `${new Date(msg.timestamp).toLocaleString()} - ${msg.sender}: ${msg.text}\n`;
    });
    messageBody += '\n';
  }
}

// 确保在文件的最后调用这些函数
checkAndAddForumButton();
checkMeetingStatus();

// 每秒钟尝试添加按钮，以防初始加载失败
const intervalId = setInterval(() => {
  if (document.getElementById('forum-button')) {
    clearInterval(intervalId);
  } else {
    checkAndAddForumButton();
    checkMeetingStatus();
  }
}, 1000);