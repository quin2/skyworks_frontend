import { writable } from 'svelte/store';

export const modelOpen = writable(false);

export const modelState = writable('');

function createCanvasList(){
	const { subscribe, set, update } = writable({})

	let openRequest = indexedDB.open("juni", 4);

	openRequest.onupgradeneeded = function() {
	  let db = openRequest.result;
	  if (!db.objectStoreNames.contains('canvasList')) {
	    db.createObjectStore('canvasList', {keyPath: 'id', autoIncrement: true }); 
	  }
	};

	openRequest.onsuccess = function() {
		//upgrade db on application open
		let db = openRequest.result;
		let transaction = db.transaction("canvasList", "readonly");
		let storedCanvasList = transaction.objectStore("canvasList");

		storedCanvasList.getAll().onsuccess = function(event) {
			const newCanvasList = event.target.result;
			set(newCanvasList);
		}
	}

	return {
		subscribe,
		new: (value) => {
			let openRequest = indexedDB.open("juni", 4);

			console.log('open')

			openRequest.onsuccess = function () {
				let db = openRequest.result;
				let transaction = db.transaction("canvasList", "readwrite");
				let canvasList = transaction.objectStore("canvasList");

				console.log(value)
				let request = canvasList.put(value); 
				request.onsuccess = function(event){
					const key = event.target.result;
					value.id = key;
					update((n) => {
						return [...n, value]
					})
				}
			}
		},
		delete: (key) => {
			let openRequest = indexedDB.open("juni", 4);

			openRequest.onsuccess = function () {
				let db = openRequest.result;
				let transaction = db.transaction("canvasList", "readwrite");
				let canvasList = transaction.objectStore("canvasList");

				let request = canvasList.delete(parseInt(key)); 
				request.onsuccess = function(event){
					update((n) => {

						console.log(n)
						console.log(key)

						const idx = n.findIndex((elem) => {
							return elem.id && elem.id == key
						})

						console.log(idx)
						if(idx !== -1){
							delete n[idx]
						}
						
						return n;
					})
				}
			}
		},
		update: (key, value) => {
			let openRequest = indexedDB.open("juni", 4);

			openRequest.onsuccess = function () {
				let db = openRequest.result;
				let transaction = db.transaction("canvasList", "readwrite");
				let canvasList = transaction.objectStore("canvasList");

				let request = canvasList.openCursor(); 
				request.onsuccess = function(event){
					const cursor = event.target.result;

					if(cursor){
						if(cursor.key == key){
							cursor.update(Object.assign(cursor.value, value));

							//make pointed insert at value
							update((n) => {
								const idx = n.findIndex(elem => elem.id == key)
								const old = [...n]
								if(idx !== -1){
									old[idx] = value
								}
								return old
							})
						} else {
							cursor.continue();
						}
					}
				}
			}
		}
	}
}

/*
structure as [.....]
*/

export const canvasList = createCanvasList();