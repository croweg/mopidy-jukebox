'use strict';

// TODO : add a mopidy service designed for angular, to avoid ugly $scope.$apply()...
angular.module('partyApp', [])
  .controller('MainController', function($scope) {

  // Scope variables
	$scope.message = [];
	$scope.tracks  = [];
	$scope.tltracks = ["Aucune musique dans la playlist"];
	$scope.timevote = 30;
	$scope.loading = true;
	$scope.ready   = false;
	$scope.trackvote = true;
	$scope.currentState = {
		paused : false,
		length : 0,
		track  : {
			length : 0,
			name   : 'Aucune musique dans la playlist, recherchez et ajoutez en !'
		}
	};
	
	// Initialize
	var mopidy = new Mopidy({
		'callingConvention' : 'by-position-or-by-name'
	});

  // Adding listenners
	mopidy.on('state:online', function () {
    
		mopidy.playback.getCurrentTrack()
			.then(function(track){
			if(track)
				$scope.currentState.track = track;
			return mopidy.playback.getState();
		})
			.then(function(state){
			$scope.currentState.paused = (state === 'paused');
			return mopidy.tracklist.getLength();
		})
			.then(function(length){
			$scope.currentState.length = length;
		})
			.done(function(){
			$scope.ready   = true;
      $scope.loading = false;
      $scope.$apply();
    });
		
		mopidy.tracklist.getTracks()
			.done(function(tltrack){
			var keys = Object.keys(tltrack);
			var tracks = [];
			for (var i = 0, len = keys.length; i < len; i++) { 
				tracks.push(tltrack[i]["name"]);
				$scope.tltracks = tracks;
			}
			$scope.$apply()
		});
	});
  
	mopidy.on('event:playbackStateChanged', function(event){
		$scope.currentState.paused = (event.new_state === 'paused');
		$scope.$apply();
	});
  
	mopidy.on('event:trackPlaybackStarted', function(event){
		$scope.currentState.track = event.tl_track.track;
		$scope.$apply();
	});
	
	mopidy.on('event:tracklistChanged', function(){
		mopidy.tracklist.getTracks()
			.done(function(tltrack){
			var keys = Object.keys(tltrack);
			var tracks = [];
			var tlenght = 	[];
			for (var i = 0, len = keys.length; i < len; i++) { 
				tracks.push(tltrack[i]["name"]);
				tlenght.push(tltrack[i]["lenght"])
				$scope.tltracks = tracks;
			}
			$scope.$apply()
		});
	});

	function trackName(tlname) {
		return tlname.album.name === name;
	}
	
	$scope.printDuration = function(track){
		if(!track.length)
			return '';
		
		var _sum = parseInt(track.length / 1000);
		var _min = parseInt(_sum / 60);
		var _sec = _sum % 60;

		return '(' + _min + ':' + (_sec < 10 ? '0' + _sec : _sec) + ')' ;
	};

	$scope.togglePause = function(){
		var _fn = $scope.currentState.paused ? mopidy.playback.resume : mopidy.playback.pause;
		_fn().done();
	};

	$scope.search = function(){

    if(!$scope.searchField)
      return;

    $scope.message = [];
    $scope.loading = true;

    mopidy.library.search({
      'any' : [$scope.searchField]
    }).done(function(res){

      $scope.loading = false;
      $scope.tracks  = [];

      var _index = 0;
      var _found = true;
      while(_found){
        _found = false;
        for(var i = 0; i < res.length; i++){
          if(res[i].tracks && res[i].tracks[_index]){
            $scope.tracks.push(res[i].tracks[_index]);
            _found = true;
            mopidy.tracklist.filter({'uri': [res[i].tracks[_index].uri]}).done(function(matches){
    if (matches.length) {
      for (var i = 0; i < $scope.tracks.length; i++){
				if ($scope.tracks[i].uri == matches[0].track.uri)
					$scope.tracks[i].disabled = true;
			}
			$scope.$apply();
		}
						});
					}
				}
				_index++;
			}
			$scope.$apply();
		});
	};

  $scope.addTrack = function(track){

    track.disabled = true;

    mopidy.tracklist.index()
			.then(function(index){
			return mopidy.tracklist.add({uris: [track.uri]});
		})
			.then(function(){
			// Notify user
			$scope.message = ['success', track.name + " à été ajouté à la playlist"];
			$scope.$apply();
			return mopidy.tracklist.setConsume([true]);
		})
    .then(function(){
      return mopidy.playback.getState();
    })
    .then(function(state){
      // Get current state
      if(state !== 'stopped')
        return;
      // If stopped, start music NOW!
      return mopidy.playback.play();
    })
    .catch(function(){
      track.disabled = false;
      $scope.message = ['error', "Impossible d'ajouter la musique, réessayez..."];
      $scope.$apply();
    })
    .done();
  };

  $scope.nextTrack = function(){
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", "/party/vote", false ); // false for synchronous request
    xmlHttp.send( null );
    $scope.message = ['success', xmlHttp.responseText];
    $scope.$apply();
  };

$scope.notifyMe = function notifyMe() {
	
	// Voyons si le navigateur supporte les notifications
  if (!("Notification" in window)) {
    alert("Ce navigateur ne supporte pas les notifications desktop");
  }

  // Voyons si l'utilisateur est OK pour recevoir des notifications
  else if (Notification.permission === "granted") {
    // Si c'est ok, créons une notification
    var text = "Votez pour enlever une musique";
		var notification = new Notification("Vote en cours !", {body: text});
		window.navigator.vibrate(500);
  }

  // Sinon, nous avons besoin de la permission de l'utilisateur
  // Note : Chrome n'implémente pas la propriété statique permission
  // Donc, nous devons vérifier s'il n'y a pas 'denied' à la place de 'default'
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission(function (permission) {

      // Quelque soit la réponse de l'utilisateur, nous nous assurons de stocker cette information
      if(!('permission' in Notification)) {
        Notification.permission = permission;
      }

      // Si l'utilisateur est OK, on crée une notification
      if (permission === "granted") {
				var text = "Votez pour enlever une musique";
				var notification = new Notification("Vote en cours !", {body: text});
				window.navigator.vibrate(500);
      }
    });
	}
	
	$("#myCarousel").carousel(0);
	var i = 30;
	var counterBack = setInterval(function(){
		i--;
		if (i >= 0){
			$('.progress-bar').css('width', i*3+6 +'%');
			$scope.trackvote = false;
			$scope.timevote = i;
			$scope.$apply()
		}
		else{
			clearInterval(counterBack);
			$("#myCarousel").carousel("next");
			$scope.trackvote = true;
			$scope.$capply()
		}
	}, 1000);
	
}

});
