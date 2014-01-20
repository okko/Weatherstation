var weatherstation = function () {
    "use strict";

    var apikey = 'PUT-IT-HERE';
    var fmisid=101004; // Kumpula, Helsinki
    var geoid=6945765; // Arabianranta, Helsinki

    var observations_baseurl = 'http://data.fmi.fi/fmi-apikey/'+apikey+'/wfs?request=getFeature&storedquery_id=fmi::observations::weather::timevaluepair&timestep=30&fmisid=';
    var forecast_baseurl = 'http://data.fmi.fi/fmi-apikey/'+apikey+'/wfs?request=getFeature&storedquery_id=fmi::forecast::hirlam::surface::point::timevaluepair&geoid=';
    var roadstatus_baseurl = 'http://data.fmi.fi/fmi-apikey/'+apikey+'/wfs?request=getFeature&storedquery_id=livi::observations::road::default::timevaluepair&place=Helsinki';

    var obs = {}; // observations
    var forec = {}; // forecast
    var road = {}; // road observations
    var readycounter = 0;

    var observations_get = function() {
        jQuery.ajax({
                url: observations_baseurl+fmisid,
                success: function (data,textStatus,jqXHR) {
                    processObservations(data);
                },
                complete: function () {
                    updateUI();
                }
            });
    };

    var forecast_get = function () {
        jQuery.ajax({
                url: forecast_baseurl+geoid,
                success: function (data,textStatus,jqXHR) {
                    processForecast(data);
                },
                complete: function () {
                    updateUI();
                }
            });
    };

    var roadstatus_get = function () {
        jQuery.ajax({
                url: roadstatus_baseurl,
                success: function (data,textStatus,jqXHR) {
                    processRoadStatus(data);
                },
                complete: function () {
                    updateUI();
                }
            });
    };

    var processObservations = function(data) {
        var observations_data = $.xml2json(data);
        $.each(observations_data.member, function( memberIndex, member ) {
                var series = member.PointTimeSeriesObservation.result.MeasurementTimeseries;
                var $series = $(series);
                /*
                  <wml2:point>
                  <wml2:MeasurementTVP>
                  <wml2:time>2013-11-23T08:30:00Z</wml2:time>
                  <wml2:value>1.2</wml2:value>
                  </wml2:MeasurementTVP>
                  </wml2:point>
                 */
                var id = $series.attr('gml:id'); // obs-obs-1-1-p_sea
                id = id.substring(12); // p_sea
                obs[id] =  $.map(series.point, function (pointElem, pointIndex) {
                        if (pointElem.MeasurementTVP.time) {
                            pointElem.MeasurementTVP.time = new Date(pointElem.MeasurementTVP.time);
                        }
                        return (pointElem.MeasurementTVP);
                });
            });
    };

    var timeString = function (date) {
        return (date.getHours()<10?'0':'') + date.getHours() + ':' + (date.getMinutes()<10?'0':'') + date.getMinutes();
    }

    var processForecast = function(data) {
        var forecast_data = $.xml2json(data);
        $.each(forecast_data.member, function( memberIndex, member ) {
                var series = member.PointTimeSeriesObservation.result.MeasurementTimeseries;
                var $series = $(series);
                var id = $series.attr('gml:id'); // mts-1-1-Pressure
                id = id.substring(8).toLowerCase(); // pressure
                forec[id] =  $.map(series.point, function (pointElem, pointIndex) {
                        if (pointElem.MeasurementTVP.time) {
                            pointElem.MeasurementTVP.time = new Date(pointElem.MeasurementTVP.time);
                        }
                        return (pointElem.MeasurementTVP);
                });
            });
    };

    var processRoadStatus = function(data) {
        var road_data = $.xml2json(data);
        $.each(road_data.member, function( memberIndex, member ) {
                var series = member.PointTimeSeriesObservation.result.MeasurementTimeseries;
                var $series = $(series);
                var id = $series.attr('gml:id'); // obs-obs-1-1-Pressure
                id = id.substring(12).toLowerCase(); // pressure
                road[id] =  $.map(series.point, function (pointElem, pointIndex) {
                        if (pointElem.MeasurementTVP && pointElem.MeasurementTVP.time) {
                            pointElem.MeasurementTVP.time = new Date(pointElem.MeasurementTVP.time);
                        }
                        return (pointElem.MeasurementTVP);
                });
            });
    };

    var updateUISnow = function () {
        $('#snow .value').html(parseInt(obs.snow_aws[23].value) + ' cm');
    };

    var updateUIRoad = function () {
        var latest = road.trs[road.trs.length-1];
        $('#roadtemp .value').html(parseInt(latest.value) + '&deg;');
        $('#roadtemp .at').html(timeString(latest.time));
    };

    var updateChart = function () {
            var chart;
            var graph;
            var dataprovider = _.union(obs.t2m, forec.temperature);
            // SERIAL CHART
            chart = new AmCharts.AmSerialChart();
            chart.brrr = function() { };
            chart.pathToImages = "lib/amcharts/images/";
            chart.dataProvider = dataprovider;
            chart.dataDateFormat = '___ MMM DD YYYY JJ:NN:SS GMT+0_00 (___)';
            chart.marginLeft = 10;
            chart.categoryField = 'time';
            
            var categoryAxis = chart.categoryAxis;

            categoryAxis.parseDates = true; // true;
            categoryAxis.equalSpacing = true;
            categoryAxis.dashLength = 6;
            categoryAxis.minorGridEnabled = true;
            categoryAxis.minorGridAlpha = 0.1;
            categoryAxis.minPeriod = '30mm';

            var valueAxis = new AmCharts.ValueAxis();
            valueAxis.axisAlpha = 0;
            valueAxis.inside = true;
            valueAxis.dashLength = 3;
            chart.addValueAxis(valueAxis);

            // GRAPH                
            graph = new AmCharts.AmGraph();
            graph.type = "smoothedLine";
            graph.lineColor = "#c1453d";
            graph.negativeLineColor = "#637bb6";
            graph.bullet = "round";
            graph.bulletSize = 4;
            graph.bulletBorderColor = "#FFFFFF";
            graph.bulletBorderAlpha = 1;
            graph.bulletBorderThickness = 2;
            graph.lineThickness = 1;
            graph.valueField = "value";
            graph.balloonText = "[[category]]<br><b><span style='font-size:14px;'>[[value]]</span></b>";
            graph.labelPosition = 'bottom';
            chart.pointPosition = 'start';
            chart.addGraph(graph);

            // CURSOR
            var chartCursor = new AmCharts.ChartCursor();
            chartCursor.cursorAlpha = 0;
            chartCursor.cursorPosition = "start";
            chartCursor.categoryBalloonDateFormat = 'JJ:NN'; // :NN';
            chart.addChartCursor(chartCursor);

            var trendLine = new AmCharts.TrendLine();
            var now = new Date;
            var fifteen = new Date(now.getTime() + 15*60000);
            trendLine.initialDate = fifteen;
            trendLine.finalDate = fifteen; // new Date; // (2013, 12, 2, 4);
            trendLine.initialValue = -40;
            trendLine.finalValue = 40;
            trendLine.lineColor = "#FF0000";
            chart.addTrendLine(trendLine);
            
            chart.write("chartdiv");
    };




    var updateRainChart = function () {
            var chart;
            var graph;
            var dataprovider = _.union(obs.r_1h, forec.precipitation1h);
            // SERIAL CHART
            chart = new AmCharts.AmSerialChart();
            chart.brrr = function() { };
            chart.pathToImages = "lib/amcharts/images/";
            chart.dataProvider = dataprovider;
            chart.dataDateFormat = '___ MMM DD YYYY JJ:NN:SS GMT+0_00 (___)';
            chart.marginLeft = 10;
            chart.categoryField = 'time';
            
            var categoryAxis = chart.categoryAxis;
            categoryAxis.categoryFunction = function (category, dataItem, categoryAxis) {
                return new Date(dataItem.time - 0*60000); // change 0 to 30 to substract 30 minutes because the FMI value is the rain amount of the previous hour, substracting 30 minutes put it in the middle of that hour
            };

            categoryAxis.parseDates = true; // true;
            categoryAxis.equalSpacing = true;
            categoryAxis.dashLength = 6;
            categoryAxis.minorGridEnabled = true;
            categoryAxis.minorGridAlpha = 0.1;
            categoryAxis.minPeriod = '30mm';

            var valueAxis = new AmCharts.ValueAxis();
            valueAxis.axisAlpha = 0;
            valueAxis.inside = true;
            valueAxis.dashLength = 3;
            chart.addValueAxis(valueAxis);

            // GRAPH                
            graph = new AmCharts.AmGraph();
            graph.type = "step";
            graph.lineColor = "#c1453d";
            graph.negativeLineColor = "#637bb6";
            graph.bullet = "round";
            graph.bulletSize = 4;
            graph.bulletBorderColor = "#FFFFFF";
            graph.bulletBorderAlpha = 1;
            graph.bulletBorderThickness = 2;
            graph.lineThickness = 1;
            graph.valueField = "value";
            graph.balloonText = "[[category]]<br><b><span style='font-size:14px;'>[[value]]</span></b>";
            graph.labelPosition = 'bottom';
            chart.pointPosition = 'start';
            chart.addGraph(graph);

            // CURSOR
            var chartCursor = new AmCharts.ChartCursor();
            chartCursor.cursorAlpha = 0;
            chartCursor.cursorPosition = "start";
            chartCursor.categoryBalloonDateFormat = 'JJ:NN'; // :NN';
            chart.addChartCursor(chartCursor);

            var trendLine = new AmCharts.TrendLine();
            var now = new Date;
            var fifteen = new Date(now.getTime() + 15*60000);
            trendLine.initialDate = fifteen;
            trendLine.finalDate = fifteen;
            trendLine.initialValue = -40;
            trendLine.finalValue = 40;
            trendLine.lineColor = "#FF0000";
            chart.addTrendLine(trendLine);
            
            chart.write("rainchartdiv");
    };

    var updateUI = function() {
        readycounter++;
        if (readycounter == 3) {
            updateUISnow();
            updateUIRoad();
            updateChart();
            updateRainChart();
        }
    };

    return {
        init: function (args) {
            observations_get();
            forecast_get();
            roadstatus_get();
            var now = new Date; $('#copy').find('.date').html(now.getUTCDate() + '.' + (now.getUTCMonth()+1) + '.' + now.getUTCFullYear());
        }
    };
};



