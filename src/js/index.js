const input = document.querySelector(".todo-list__input");
const toggle = document.querySelector(".todo-list__theme-toggle");
const list = document.querySelector(".todo-list__body");
const itemsLeftNode = document.querySelector(".todo-list__items-left");
const all = document.querySelector("#all");
const active = document.querySelector("#active");
const complete = document.querySelector("#complete");
const clearComplete = document.querySelector('.todo-list__filters-clear');

input.focus();

function toggleListener() {
  toggle.addEventListener("click", () => {
    let currentTheme = document.documentElement.dataset["theme"];
    if (currentTheme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  });

  let theme = localStorage.getItem("theme");
  if (theme) {
    setTheme(theme);
  }
}

toggleListener();

function setTheme(theme) {
  if (theme != "dark" && theme != "light") {
    console.error(`invalid theme '${theme}'`);
    return;
  }

  document.documentElement.dataset["theme"] = theme;
  localStorage.setItem("theme", theme);
}

const dbName = "list_db";
var db = null;

let request = window.indexedDB.open(dbName);
request.onsuccess = () => {
  db = request.result;
  displayData();
  updateItemsLeft();
};

request.onupgradeneeded = (e) => {
  let db = e.target.result;
  let objectStore = db.createObjectStore("list_os", {
    keyPath: "id",
    autoIncrement: true,
  });
  objectStore.createIndex("text", "text", { unique: false });
  objectStore.createIndex("complete", "complete", { unique: false });
  console.log("database setup complete");
};

input.addEventListener("keyup", (e) => {
  if (e.keyCode == 13) {
    addData();
  }
});

function addData() {
  let newItem = {
    text: input.value,
    complete: false,
  };
  let transaction = db.transaction(["list_os"], "readwrite");
  let objectStore = transaction.objectStore("list_os");
  let request = objectStore.add(newItem);
  request.onsuccess = () => {
    input.value = "";
    input.focus();
    console.log("todo item added");
  };

  transaction.oncomplete = () => {
    console.log("added item, transaction complete");
    displayData();
  };

  transaction.onerror = () => {
    console.error("error adding todo item");
  };
}

function displayData(kind = "all") {
  while (list.firstChild) {
    list.firstChild.remove();
  }

  if (kind === "all") {
    all.classList.add("todo-list__filters-current");
    active.classList.remove("todo-list__filters-current");
    complete.classList.remove("todo-list__filters-current");
  } else if (kind === "active") {
    all.classList.remove("todo-list__filters-current");
    active.classList.add("todo-list__filters-current");
    complete.classList.remove("todo-list__filters-current");
  } else if (kind === "complete") {
    all.classList.remove("todo-list__filters-current");
    active.classList.remove("todo-list__filters-current");
    complete.classList.add("todo-list__filters-current");
  }

  let objectStore = db.transaction("list_os").objectStore("list_os");
  objectStore.openCursor().onsuccess = (e) => {
    let cursor = e.target.result;
    if (cursor) {
      const listItem = document.createElement("li");
      listItem.classList.add("todo-list__item");
      const check = document.createElement("div");
      check.classList.add("todo-list__item-check");
      const remove = document.createElement("div");
      remove.classList.add("todo-list__item-remove");
      const text = document.createElement("div");
      text.classList.add("todo-list__item-text");
      text.textContent = cursor.value.text;
      listItem.dataset["id"] = cursor.value.id;

      if (cursor.value.complete) {
        listItem.classList.add("todo-list__item_checked");
      }

      remove.onclick = deleteData;
      check.onclick = markComplete;
      listItem.appendChild(check);
      listItem.appendChild(text);
      listItem.appendChild(remove);
      if (kind === "all") {
        list.appendChild(listItem);
      } else if (kind === "active") {
        if (!cursor.value.complete) {
          list.appendChild(listItem);
        }
      } else if (kind === "complete") {
        if (cursor.value.complete) {
          list.appendChild(listItem);
        }
      }
      cursor.continue();
    }
  };
  updateItemsLeft();
}

function updateItemsLeft() {
  let objectStore = db.transaction("list_os").objectStore("list_os");
  let itemsLeft = 0;
  objectStore.openCursor().onsuccess = (e) => {
    let cursor = e.target.result;
    if (cursor) {
      if (!cursor.value.complete) {
        itemsLeft++;
      }
      cursor.continue();
    } else {
      if (itemsLeft == 1) {
        itemsLeftNode.textContent = "1 item left";
      } else {
        itemsLeftNode.textContent = itemsLeft + " items left";
      }
    }
  };
}

function deleteData(e) {
  let itemId = Number(e.target.parentNode.dataset["id"]);
  let transaction = db.transaction(["list_os"], "readwrite");
  let objectStore = transaction.objectStore("list_os");
  objectStore.delete(itemId);
  transaction.oncomplete = () => {
    e.target.parentNode.remove();
  };
  updateItemsLeft();
}

function markComplete(e) {
  let itemId = Number(e.target.parentNode.dataset["id"]);
  let transaction = db.transaction(["list_os"], "readwrite");
  let objectStore = transaction.objectStore("list_os");
  let request = objectStore.get(itemId);
  request.onsuccess = (e) => {
    let newItem = e.target.result;
    if (newItem.complete) newItem.complete = false;
    else newItem.complete = true;
    let putRequest = objectStore.put(newItem);
    putRequest.onsuccess = () => {
      displayData();
    };
  };
}

all.addEventListener("click", () => {
  displayData();
});

active.addEventListener("click", () => {
  displayData("active");
});

complete.addEventListener("click", () => {
  displayData("complete");
});

clearComplete.addEventListener('click', () => {
  let transaction = db.transaction(['list_os'], 'readwrite');
  let objectStore = transaction.objectStore('list_os');
  objectStore.openCursor().onsuccess = (e) => {
    let cursor = e.target.result;
    if (cursor) {
      if (cursor.value.complete) {
        objectStore.delete(cursor.value.id);
      }
      cursor.continue();
    }
  };
  displayData();
});
