// ==UserScript==
// @name         pr0 filter
// @description  filters by tags
// @namespace    filter
// @version      1.1.0.4
// @author       cRYPTOR
// @match        *://pr0gramm.com/*
// @grant		 none
// ==/UserScript==

$(document).ready(function(){

	var filterSettings = {
		tags: ['wichtel', 'repost'],
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

	var promoted = false;
	var getId = function(e){
		return promoted ? e.promoted : e.id;
	}

	var searchObjects = [];
	var searchObjectFactory = {
		createSearchObject : function(content, callback){
			searchObjects.push({
				searchContainers: [],
				searchOptions:{
					'tags':content
				},
				ids: {},
				is: function(id){
					return this.ids[id] != undefined;
				},
				needsUpdate: function(id){
					return !this.containerContains(id);
				},
				containerContains: function(id){
					var toReturn = true;
					$(this.searchContainers).each(function(i,e){
						if( id >= e.min && id <= e.max ){
							return toReturn = false;
						}
					});
					return !toReturn;
				},
				update: function(id, callback, callbackData){

					var o = this;
					o.searchOptions.flags = p.user.flags;
					o.searchOptions.older = id;
					o.searchOptions.promoted = promoted;

					p.api.get('items.get', o.searchOptions, function(data){
						var c = o.searchContainers[o.searchContainers.push({max:id,min:Number.MAX_VALUE})-1];
						if(data.items.length == 0) {
							c.min = -1;
							return call(callback, callbackData);
						}
						$(data.items).each(function(i, e){
							var id = getId(e);
							if( id < c.min){
								c.min = id;
							}
							o.ids[id] = 1;
						});
						return call(callback, callbackData);
					});
				}
			});
			call(callback);
		}
	};

	var updateAll = function(d){		
		if( searchObjects.length == 0){
			return call(d.callback);
		}
		var isUp2Date = true;
		$(d.data.items).each(function(iIndex, i){		
			if(!isUp2Date){
				return false;	
			}
			$(searchObjects).each(function(sOIndex, sO){
				var id = getId(i);
				if( sO.needsUpdate(id)){
					sO.update(id, updateAll, d);
					return isUp2Date = false;
				}
			});
		});

		if( isUp2Date ){
			call(d.callback);
		}
	};

	p.Stream.prototype._load = function(options, callback){

		var stream = this;
		options.flags = p.user.flags;

		p.api.get('items.get', p.merge(options, this.options), function (data){

			promoted = stream.options.promoted;
			if( stream.options.tags != undefined || stream.options.user != undefined ){
				var position = stream._processResponse(data);
				callback(data.items, position, data.error);
				return;
			}

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

		var pathName = document.location.pathname;
		if( !(pathName.indexOf('top') > -1 
		   || pathName.indexOf('new') > -1 
		   || pathName == '/') ){
			return;
		}

		if( p.currentView.loadInProgress ){
			setTimeout(softReload,10);
			return;
		}

		var $currentItem = p.currentView.$currentItem;
		if($currentItem != undefined){
			p.currentView.hideItem();
		}

		var isTop = pathName.indexOf('top') > -1;
		p.currentView.show({tab:isTop ? 'top' : 'new'});

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