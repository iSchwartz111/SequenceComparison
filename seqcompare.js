(function() {

  var root = typeof self == 'object' && self.self === self && self ||
          typeof global == 'object' && global.global === global && global ||
          this ||
          {};

  var seqcompare = function(elem) {

    this.isColor       = false;
    this.isSame        = false;
    var uncollapsed    = false;


    /* Data Analysis */
    //Creates array based on first sequence
    this.firstSequence = data[0].value.split("");
                        //Finds the consensus of the sequences for each base and stores this as a string
    this.conString     = findConsensus();
                        //Finds location of completely continuous bases through each string and stores this in an array
    var continuous    = findContinuous();
                        //Finds how many continuous bases occur in a row and stores this as values in an array
    this.annotArray    = findHeat(continuous);
                        //Creates scale for heat of each element
    this.heatScale     = d3.scaleLinear().domain([0, _.max(annotArray)]).range([0,1]);
                        //Creates interpolate function
    this.heat          = d3.interpolateLab("steelblue", "DarkOrange");


                        //Creates div container to hold everything
    this.container     = d3.select(elem)
                          .append("div")
                          .attr("class", "container-fluid");
    /* Axis */
                        //Creates row for axis
    var axisRow       = container.append("div")
                          .attr("class", "row");
                        //Creates column to keep axis aligned with sequences
                        axisRow.append("div")
                          .attr("class", "col-xs-1")
                          .attr("id", "nameArea");   
                        //Creates col for axis svg
    this.svgCol        = axisRow.append("div")
                          .attr("class", "col-xs-11")
                          .attr("id", "area");
                        //Creates width variable as width of the whole column
    var width         = parseInt(d3.select("#area").style("width"), 10);
                        //Appends svg to top row
    var svg           = svgCol.append("svg")
                          .attr("width", width - 25)
                          .attr("height", 25);
                        //Horizontal scale
    var xScale        = d3.scaleLinear()
                          .domain([0, data[0].value.length])
                          .range([0, data[0].value.length * 8.42]);
                        //Creates axis
    var xAxis         = d3.axisTop(xScale);
                        //Calls the bottom axis
                        svg.append("g")
                          .attr("class", "axis")
                          .attr("transform", "translate(-8.5,25)")
                          .call(xAxis)
                          .select("text").remove();
    
                        //Creates names, sequences, and annotations
                        createData();                        
                        //Resizes svg and its elements to fit to window
                        d3.select(window).on('resize', _.throttle( resize, 500, {leading: false} ));

                        //Records when and what user highlights
                        d3.selectAll("#seqSpace").on("mouseup", selectText);
                        d3.selectAll("#seqSpace").on("mousedown", selectText);

                        d3.select("#color").on("mouseup", checkColor);
                        d3.select("#same").on("mouseup", sameChar);
                        d3.select("#search").on("mouseup", searcher);
                        d3.select("#clear").on("mouseup", clearText);

  };

  /* Function Declarations */
  //Creates names, sequences, and annotations
  function createData() {

    var self = this;
    var newCutOff = 0;
    //Finds the width of the sequence column
    var seqWidth         = Math.floor((parseInt(d3.select("#area").style("width"), 10) - 4 * 8.42 - 15)/8.42);
    //Finds the width of the name column
    var nameWidth        = Math.floor((parseInt(d3.select("#nameArea").style("width"), 10) - 3 * 8.42)/8.42);
      //Creates new rows for sequences that were cut off by window. Appends remaining data to new rows
      for( var cutoff = 0; cutoff != firstSequence.length - 1; cutoff = newCutOff ) {
        /* Base divs */
                            //Creates parent row for each data set
            var parent    = self.container.append("div")
                              .attr("class", "row parent");
                            //Creates row for each datum
            var row       = parent.selectAll("rows")
                              .data(data)
                              .enter()
                              .append("div")
                              .attr("class", "row");
        /* Raw Data */
            /* Names */
                            //Appends name column
            var nameCol   = row.append("div")
                              .attr("class", "col-xs-1") 
                              .attr("id", "namePlate")
                              .attr("data-toggle", "tooltip")
                              .attr("title", function(d) { return d.name;})
                              .attr("data-placement", "right")
                              .append("p");

                            //Enters the names
                            nameCol.selectAll("p")
                              .data(function(d, i) { return d.name.split(""); })
                              .enter()
                              .append("span")
                              .filter( function(d, i) { return i <= nameWidth; })
                              .text(function(d, i) { 
                                //Truncates if name is too long
                                if( i == nameWidth )
                                  return "...";
                                else
                                  return d; 
                              });
            /* Sequences */
                            //Creates sequence columns
            var sequences = row.append("div")
                              .attr("class", "col-xs-11")
                              .attr("id", "seqSpace")
                              .append("p");
                            //Finds the width of the sequence column
            var temp      = cutoff ? cutoff + 1 : 0;
                seqWidth  += temp;
                            //Enters the sequences
                            sequences.selectAll("text")
                              .data(function(d) { return d.value; })
                              .enter()
                              .filter( function(d, i) { return i < seqWidth;})
                              .append("span")
                              .text(function(d, i) {
                                //Does not enter same base twice when wrapping data to new row                       
                                if ( i < cutoff || i !== 0 && i == cutoff  )
                                  return ;
                                newCutOff = i;
                                  //Checks for sameChar toggle after resize
                                if( self.isSame ) {                       
                                  if( d == firstSequence[i] )
                                    return d;
                                  else
                                    return ".";
                                } 
                                else
                                  return d;
                                })
                              .attr("class", "sequence")
                              //Labels each base as their index for selecting later
                              .attr("data-index", function(d, i) { return i;});

                            //Checks for color code toggle after resize
                            if( self.isColor === true ) {
                              colorize();
                            }
        /* Annotations */
            /* Consensus */
                            //Creates row for consensus
            var conRow    = parent.append("div")
                              .attr("class", "row collapse conRow")
                              .attr("id", "conRow");
                            //Writes "Consensus" name plate
                            conRow.append("div")
                              .attr("class", "col-xs-1")
                              .attr("data-toggle", "tooltip")
                              .attr("title", "Consensus")
                              .attr("data-placement", "right")
                              .append("p")
                              .append("span")
                              .text(function() {
                                //Truncates name if too long
                                if( "Consensus".length > nameWidth )
                                  return "Consensus".substring(0, nameWidth) + "...";
                                else 
                                  return "Consensus";
                              });
                            //Enters the consensus of the sequences
                            conRow.append("div")
                              .attr("class", "col-xs-11")
                              .append("p")
                              .append("span")
                              .text(self.conString.substring( temp , newCutOff + 1 ))
                              .attr("class", "conText");
            /* Heat Map */
                            //Creates annotation row
            var annotRow  = parent.append("div")
                              .attr("class", "row");
                            //Writes "Annotation" name plate
                            annotRow.append("div")
                              .attr("class", "col-xs-1")
                              .attr("data-toggle", "tooltip")
                              .attr("title", "Frequency")
                              .attr("data-placement", "right")
                              .append("p")
                              .append("span")
                              .text(function() {
                                //Truncates if too long
                                if( "Frequency".length > nameWidth )
                                  return "Frequency".substring(0, nameWidth) + "...";
                                else 
                                  return "Frequency";
                              });
                            temp = cutoff + (cutoff ? 1 : 0);
                            //Creates heatmap annotation
                            annotRow.append("div")
                              .attr("class", "col-xs-11")
                              .append("p")
                              .selectAll("p")
                              .data(firstSequence)
                              .enter()
                              .append("span")
                              .filter( function(d, i) { return i <= newCutOff - cutoff - ( cutoff ? 1 : 0 );})
                              .text("\u00A0")
                              .style("background-color", function(d, i) { return self.heat(self.heatScale(self.annotArray[ i + temp ])); })
                              .style("stroke", function(d, i) { return self.heat(self.heatScale(self.annotArray[ i + temp ] )); });
      }
  }

  //Resizes everything to fit into window
  function resize() {
                        //Axis width resize
        width         = parseInt(d3.select("#area").style("width"), 10);
            
                        this.svgCol.selectAll("svg")
                          .attr("width", width - 25);

                        //Removes data that is outside window
                        container.selectAll(".parent")
                          .remove();
                        //Recreates data inside window
                        createData();

                        //Redefines highlihgt for new sequences
                        d3.selectAll("#seqSpace").on("mouseup", selectText);
  }

  //Finds the most common base in each column and returns it as a string
  function findConsensus() {
    var consensus     = "";
      //Counts each base's occurrence
      for( var base = 0; base < firstSequence.length; base++ ) {
        var compare = [];
          for( var seq = 0; seq < data.length; seq++ ) {
            compare[seq] = data[seq].value.split("")[base];
          }

        var countBase = _.countBy( compare);
        var numBases  = [countBase.A, countBase.C, countBase.G, countBase.T];
        var maximum   = _.max( numBases );
        //Checks there is only one maximum
        var indexMax  = _.indexOf( numBases, maximum );
          //Appends most frequent base to consensus
          if( indexMax == _.lastIndexOf( numBases, maximum ))
            switch( indexMax ) {
              case 0: consensus += "A"; break;
              case 1: consensus += "C"; break;
              case 2: consensus += "G"; break;
              case 3: consensus += "T"; break;
            }
          else
            consensus += "?";
      }
    return consensus;
  }

  //Find continuous values for the heatmap. Returns array of with element 1 for continuous base, 0 otherwise
  function findContinuous() {
    var annotation    = [];

      //Counts each bases' occurence
      for( var base = 0; base < firstSequence.length; base++ ) {
        var compare = [];

          for( var seq = 0; seq < data.length; seq++ ) {
            compare[seq] = data[seq].value.split("")[base];
          }

        //Checks that base is continuous
        (_.uniq(compare).length == 1) ? annotation[base] = 1 : annotation[base] = 0;
      }

    return annotation;
  }

  //Uses array of 0's and 1's to find how "hot" each element of the heat map is. Returns array with heat values
  function findHeat(array) {
                        //Creates 0 array
    var heatArray     = Array.apply(null, Array(firstSequence.length)).map(Number.prototype.valueOf,0);
    var count         = 0;
      for( var i = 0; i < firstSequence.length; ) {
        var a = 0;
          if( array[i] == 1) {
            count = _.indexOf(array.slice(i), 0);

              for( var j = 0; j < count; j++) {
                if( j == count / 2 ) {
                  heatArray[i] = a;
                  i++;
                }
                (j < count / 2) ? a++ : a--;
                heatArray[i] = a;
                i++;
              }
          }
          else
            i++;
      }
            return heatArray;
  }

  //Checks color code value and changes sequence color accordingly
  var checkColor = function(elem) {

    if( self.isColor === true ) {
      container.selectAll("#seqSpace")
        .selectAll("span")
        .attr("class", "sequence");
      self.isColor = false;
      return ;
    }

    if( self.isColor === false ) {
      self.isColor = true;
      colorize();
      return ;
    }
  };

  //Color codes sequences based on base value
  function colorize() {
    container.selectAll("#seqSpace")
      .selectAll("span")
      .data(function(d) { return d.value; } )
      .attr("class", function(d) {
        if( d == "A")
          return "adenine";
        if( d == "C")
          return "cytosine";
        if( d == "G")
          return "guanine";
        if( d == "T")
          return "thymine";});
  }

  //Removes characters that do not match the first sequence on button press
  function sameChar() {
    var self = this;

    var box = 0;
    var newEnd;
    var seqWidth = Math.floor((parseInt(d3.select('#seqSpace').style('width'), 10) - 4 * 8.42 - 15)/8.42);
      for( var end = 0; end != firstSequence.length - 1; box++ ) {
        container.selectAll(".parent")
          .filter(function(d, i) { return i === box; })
          .selectAll("#seqSpace")
          .selectAll("span")
          .data(function(d) { return d.value; })
          .filter(function(d, i) { return i < seqWidth + (end ? end + 1 : 0); })
          .text(function(d, i) {
                if ( i < end || i != 0 && i == end )
                  return ;
                //Truncates part that doesnt fit in window
                  //Saves last base to be entered
                  newEnd = i;
                  if( self.isSame )
                    return d;
                  else {                     
                    if( d == firstSequence[i] )
                      return d;
                    else
                      return ".";
                  };
          });
          end = newEnd;
      }
    self.isSame = !self.isSame;
  }   

  //Finds users selection index
  function selectText() {
    var selection     = window.getSelection();
    var anchor        = selection.anchorNode.parentElement.getAttribute("data-index");
    var focus         = selection.focusNode.parentElement.getAttribute("data-index");

        document.getElementById("inputAnchor").value = (parseInt(anchor) + 1);
        document.getElementById("inputFocus").value  = (parseInt(focus) + 1);
        searchSelected(anchor, focus);
  }   

  //Clears all selections
  function clearText() {
                        d3.selectAll("#seqSpace")
                          .selectAll("span")
                          .attr("id", "none");
  } 

  //Selects all rows with same index
  function searchSelected(anchor, focus) {

                        d3.selectAll("#seqSpace")
                          .selectAll("span")
                          .attr("id", "none");

                        d3.selectAll("#seqSpace")
                          .selectAll("span")
                          .filter( function(d, i) { return i <= Math.max(anchor, focus); })
                          .attr("id", function(d, i) {
                            if( i >= Math.min(anchor, focus) )
                              return "selected";
                          });
  }  
  //Selects bases based on search
  function searcher() {
    var anchor        = document.getElementById("inputAnchor").value - 1;
    var focus         = document.getElementById("inputFocus").value - 1;
                        searchSelected(anchor, focus);
  }

  root.seqcompare = seqcompare;

}.call(this));
