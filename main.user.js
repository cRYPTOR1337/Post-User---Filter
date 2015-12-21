// ==UserScript==
// @name         pr0 filter
// @description  filters by tags
// @namespace    filter
// @version      1.1.0.1
// @author       cRYPTOR
// @match        https://pr0gramm.com/*
// @match        http://pr0gramm.com/*
// @grant		 none
// ==/UserScript==

$(document).ready(function(){

	var filterSettings = {
		tags: ['repost', 'wichtel', 'star wars'],
		marks: {
			'0':0, // Schwuchtel
			'1':0, // Neuschwuchtel
			'2':0, // Altschwuchtel
			'3':0, // Admin
			'4':0, // Gesperrt
			'5':0, // Moderator
			'6':1, // Fliesentischbesitzer
			'7':0, // Lebende Legende
			'8':0, // pr0wichtler
			'9':0, // Edler Spender
		},
		debug: false,
	};

	var call = function(callback, callbackData){
		if( callback != null){
			return callback(callbackData);
		}
	};

	var debugLog = function(str){
		if( filterSettings.debug){
			console.log(str);
		}
	};

	var searchObjects = [];
	var searchObjectFactory = {
		createSearchObject : function(content, callback){
			searchObjects[searchObjects.push({
				searchOptions:{
					'tags':content
				},
				min: 0,
				max: 0,
				ids: {},
				is: function(id){
					if( id > this.max )
						return false;
					if( id < this.min )
						debugLog('error!');
					return this.ids[id] != undefined;
				},
				needsUpdate: function(id){
					return id < this.min;
				},
				update: function(callback, callbackData){

					var o = this;
					o.searchOptions.flags = p.user.flags

					p.api.get('items.get', o.searchOptions, function(data){
						if( data.items.length > 0){

							o.max = 0;
							o.min = Number.MAX_VALUE;

							$(data.items).each(function(iIndex, i){
								var id = i.id;
								if( id > o.max)
									o.max = id;
								if( id < o.min)
									o.min = id;
								o.ids[id] = 1;
							});

							o.searchOptions.older = o.min;
							debugLog(o.searchOptions.older);
						}else{
							o.min = -1;
						}
						call(callback, callbackData);
					});
				}
			}) - 1].update(callback);
		}
	};

	var updateAll = function(inData){
		var up2Date = [];

		if( searchObjects.length > 0){
			$(inData.data.items).each(function(iIndex, i){

				$(searchObjects).each(function(sOIndex, sO){

					if( up2Date[sOIndex] != undefined ||
					 	!sO.needsUpdate(i.id) ){
						return;
					}

					up2Date[sOIndex] = 1;
					sO.update(updateAll, inData);
				});

				if( up2Date.length == searchObjects.length){
					return false;
				}
			});
		}

		if( up2Date.length == 0 ){
			call(inData.callback);
		}
	};

	p.Stream.prototype._load = function(options, callback){

		var stream = this;
		options.flags = p.user.flags;

		p.api.get('items.get', p.merge(options, this.options), function (data){
			updateAll({ 
				'data' : data,
				'callback' : function(){

					var oldLength = data.items.length;

					data.items = $.grep(data.items, function(el, i){
						return filterSettings.marks[el.mark] == 0;
					});

					if(searchObjects.length > 0){
						data.items = $.grep(data.items, function(el, i){
							var keep = true;
							$(searchObjects).each(function(sOIndex, sO){
								if( sO.is(el.id) ){
									return keep = false;
								}
							});
							return keep;
						});
					}

					var dif = oldLength - data.items.length;
					if( dif > 0 ){
						debugLog('filtered ' + dif + ' items!');
					}

					var position = stream._processResponse(data);
					callback(data.items, position, data.error);
				}
			});
		});
	};	

	var softReload = function(){

		if( p.currentView.loadInProgress ){
			setTimeout(softReload,10);
			return;
		}

		var $currentItem = p.currentView.$currentItem;
		if($currentItem != undefined){
			p.currentView.hideItem();
		}

		p.currentView.show({});

		if($currentItem != undefined){
			$currentItem = $('#' + $currentItem[0].id);
			if($currentItem[0] != undefined){
				p.currentView.showItem($currentItem, 1);
			}		
		}
	}

	if(filterSettings.tags.length > 0){
		var count = 0;
		$(filterSettings.tags).each(function(i,t){
			searchObjectFactory.createSearchObject(t, function(){
				++count;
				if( count == searchObjects.length){
					softReload();
				}
			});
		});
	}else{
		softReload();
	}
});