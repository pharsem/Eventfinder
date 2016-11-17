var geocoder;
var map;
var markers = [];

$(document).ready(function() {
    initialize();
    getCategoryList();
});

function initialize() {
    
  
    var mapOptions = {
        zoom: 16,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    }
  
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    
    geocoder = new google.maps.Geocoder();
    
    // Try HTML5 geolocation
    if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = new google.maps.LatLng(position.coords.latitude,
                                       position.coords.longitude);
        
        var marker = new google.maps.Marker({
            map: map,
            position: pos,
            title: "You are here"
        });

      map.setCenter(pos);
    }, function() {
      handleNoGeolocation(true);
    });
  } else {
    // Browser doesn't support Geolocation
    handleNoGeolocation(false);
  }
    
    google.maps.event.addListener(map, 'zoom_changed', loadEvents);
    google.maps.event.addListener(map, 'dragend', loadEvents);
    google.maps.event.addListenerOnce(map, 'idle', loadEvents);
}

function handleNoGeolocation(errorFlag) {
    if (errorFlag) {        
        var error = 'Error: The Geolocation service failed.';  
    } else {    
        var error = 'Error: Your browser doesn\'t support geolocation.'; 
    }
    
    
    document.getElementById('loadMessage').innerHTML = error;
        
    setTimeout(function() {
        document.getElementById('loadMessage').innerHTML = "";
    }, 3000);
  
}

/*
 * Method for searching for locations
 */

function searchLocation() {
    var search = document.getElementById('search').value;
    
    geocoder.geocode( { 'address': search}, function(results, status) {
        
      if (status == google.maps.GeocoderStatus.OK) {
          
        map.setCenter(results[0].geometry.location);
        
        loadEvents();
          
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
}


function loadEvents() {
    
    document.getElementById('loadMessage').innerHTML = 'Loading events, please be patient...';
    document.getElementById('numberWarning').innerHTML = "";
    
    var centerLatLng = map.getCenter();
    var centerLat = centerLatLng.lat();
    var centerLng = centerLatLng.lng();
    var radius = getRadius();
    
    var selectCat = document.getElementById("selectCategory");
    var categoryId = selectCat.options[selectCat.selectedIndex].value;
    var category;
    
    if (categoryId == "all") {
        category = "";
    } else {
        category = "&category=" + categoryId;
    }
    
    var selectTime = document.getElementById("selectTime");
    var when = "&date=" + selectTime.options[selectTime.selectedIndex].value;

    
    // Send the Request        
    jsonRequest("http://api.eventful.com/json/events/search?app_key=<EVENTFUL_API_KEY>&where=" + centerLat + "," + centerLng +
                "&within=" + radius + category + "&page_size=100&sort_order=date" + when + "&callback=processJSONP");

};

/*
 * Calculate the radius of the current view area
 */
function getRadius() {
    bounds = map.getBounds();

    center = bounds.getCenter();
    ne = bounds.getNorthEast();

    // r = radius of the earth in statute miles
    var r = 3963.0;  

    // Convert lat or lng from decimal degrees into radians (divide by 57.2958)
    var lat1 = center.lat() / 57.2958; 
    var lon1 = center.lng() / 57.2958;
    var lat2 = ne.lat() / 57.2958;
    var lon2 = ne.lng() / 57.2958;

    // distance = circle radius from center to Northeast corner of bounds
    var distance = r * Math.acos(Math.sin(lat1) * Math.sin(lat2) + 
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1));
    
    return distance;
}
		


/*
 * Function for JSON Request
*/
function jsonRequest(url)
{
     var script=document.createElement('script');
     script.src=url;
     document.getElementsByTagName('head')[0].appendChild(script);
}



function getCategoryList() {
    
    jsonRequest("http://api.eventful.com/json/categories/list?app_key=<EVENTFUL_API_KEY>&callback=processCategoryList");
    
}

function processCategoryList(data) {
    categories = []
    
    var select = document.getElementById("selectCategory");
    
    for(var i = 0; i < data.category.length; i++) {
        var thisCategory = data.category[i];
        
        // Decode &amp; back to &
        var categoryName = thisCategory.name.replace(/&amp;/g, '&');
        
        var element = document.createElement("option");
        element.textContent = categoryName;
        element.value = thisCategory.id;
        select.appendChild(element);
        
    }
}


/*
Callback function after the request
*/
function processJSONP(data){

	if(data.total_items==0) {				          // Results count is null. So no data obtained
        
		document.getElementById('loadMessage').innerHTML = 'No events found in this area';
        
        setTimeout(function() {
            document.getElementById('loadMessage').innerHTML = "";
        }, 3000);
        
    } else {		
        
        if (data.total_items > 100) {
            document.getElementById('numberWarning').innerHTML = "More events available, only 100 events will be loaded to the map at once";
        }
        
        while(markers[0]) {
            markers.pop().setMap(null);
        }
        
        for(var i = 0; i < data.total_items; i++) {             												// Iterate through list of events

            $thisevent = data.events.event[i];                                                                  // Get the current event
          
            
            var marker = new google.maps.Marker({	
                position: new google.maps.LatLng($thisevent.latitude, $thisevent.longitude),		            // Get the latitude and longitude
                icon:"images/events.png",																	            // Custom image icon
				title: $thisevent.title	                                                                        // Set title
            });
            
            markers.push(marker);
            
          var infowindow = new google.maps.InfoWindow();		  
          marker.setMap(map);
            
            
            var stopTime;
            
            // Don't show end time if it's null
            if ($thisevent.stop_time == null) {
                stopTime = "";
            } else {
                stopTime = " - " + $thisevent.stop_time;
            }
                      
          marker.set('content', "<div id='iwContent'><h1>" + $thisevent.title + "</h1>" + "<b>Date & time:</b> " + $thisevent.start_time + 
                                stopTime + "<br /><b>Venue:</b> <a href='" + $thisevent.venue_url + "' target='_blank'>" + $thisevent.venue_name + 
                                "</a></br><a href=" + $thisevent.url + " target='_blank'>More info</a></div>");
            

				google.maps.event.addListener(marker,'click',function() {	   // On click event listener
                    var position = this.getPosition();
                    
                    var content = this.get('content');
                    
                    infowindow.setContent(content);
                    infowindow.open(map,this);									// Open infowindow associated with this marker
                    infowindow.marker = marker;
                    
                    getWeather(position.lat(), position.lng(), infowindow);
				});
				
            document.getElementById('loadMessage').innerHTML = "Events loaded";
            
            setTimeout(function() {
                document.getElementById('loadMessage').innerHTML = "";
            }, 3000);
		  
	  }
        
	}
    
}


function getWeather(lat, lng, infowindow) {
    var currentContent = infowindow.content;
    
    var weather = '<iframe src="http://api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lng + '&appid=<OPENWEATHERMAP_APP_ID>&mode=html"></iframe>'
    
    infowindow.setContent(currentContent + weather);
            
}
