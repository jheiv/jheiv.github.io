function logf(n) {
    return n === 0 ? 0 : (n + .5) * Math.log(n) - n + 0.9189385332046728 + 0.08333333333333333 / n - 0.002777777777777778 * Math.pow(n, -3);
}

function binomial(n , k) {
    return Math.round(Math.exp(logf(n) - logf(n - k) - logf(k)));
}

function neuter(name) {
    name = name.replace(/\(\d+\)/g,'').trim();
    return name.replace(/\s/g,'_').replace(/\W/g, '').toLowerCase();
}

function allPairs(opts)
{
    var pairs = [];
    var i, j;
    
    for(i=0; i<opts.length; i++){
        for (j=i+1; j<opts.length; j++){
            pairs.push([opts[i], opts[j]]);
        }
    }
    
    return pairs;
}

// From: https://gist.github.com/cybercase/db7dde901d7070c98c48
function product() {
  var args = Array.prototype.slice.call(arguments); // makes array from arguments
  return args.reduce(function tl (accumulator, value) {
    var tmp = [];
    accumulator.forEach(function (a0) {
      value.forEach(function (a1) {
        tmp.push(a0.concat(a1));
      });
    });
    return tmp;
  }, [[]]);
}


$( function() {
    var entries_config  = null;
    var entries_options = null;
    
    
    $( "#accordion" ).accordion({
        collapsible: true
    });
    
    $("textarea#input").val(sample);
    
    function debug(s)
    {
        var taLog = $("textarea[name='debug']")
        taLog.val(taLog.val() + s + "\n");
    }
    

    
    function Entry(line){
        this.raw = line;
        this.com = line.startsWith('#');
        this.key = null;
        this.val = null;
        
        // Trim line
        if (line.startsWith("#")){ line = line.substring(1).trim(); }
        
        // Parse key/value
        var sep = line.indexOf('=');
        if (sep !== -1){
            this.key = line.substring(0, sep);
            this.val = line.substring(sep + 1);
        }
    }

    $("#tab-options").scroll(function(){
        var $this = $(this);
        $("#status-note").css("top", $this.scrollTop());
    });
    
    
    /*== CONSTANTS ===============================================================================*/
    var GEAR_KEYS = ["head", "neck", "shoulder", "back", "chest", "shirt", "tabard", "wrist",
        "hands", "waist", "legs", "feet", "finger1", "finger2", "trinket1", "trinket2", "main_hand"];
        
    var GEAR_SLOTS = ["head", "neck", "shoulder", "back", "chest", "shirt", "tabard", "wrist",
        "hands", "waist", "legs", "feet", "rings", "trinkets", "main_hand"]
    
    var BAG_REGEX = new RegExp('#\n# (.*)\n# ([^=]*)=(.*)\n', 'g');
    
    /*== PARSE ===================================================================================*/
    $("input[name='parse']").click(function(){
        // Collapse all accordion elements
        //$('#accordion').accordion("option", "active", false);
        
        var input = $("textarea#input").val();
        
        var config  = [];
        var entries = [];

        var lines = input.split('\n');
        for(var i=0; i<lines.length; i++)
        {
            var line = lines[i];
            
            // Skip blank lines
            if (line.length < 3){ continue; }
            
            // Skip comments for this pass
            if (line.startsWith("#")){ continue; }
            
            // Build Entry object
            var entry = new Entry(line);
            
            if($.inArray(entry.key, GEAR_KEYS)  !== -1){
                entry.name = "(Equipped)";
                if(entry.key.endsWith('1')){ entry.name = "(Equipped - Slot 1)"; }
                if(entry.key.endsWith('2')){ entry.name = "(Equipped - Slot 2)"; }
                
                entries.push(entry);
            }
            else{
                config.push(entry);
            }            
        }
        
        // Create empty gear options lists, one for each slot
        var gear_options = new Map();
        for (let key of GEAR_KEYS){
            gear_options.set(key, []);
        }
        
        // Add base gearset to options
        for(let i=0; i<entries.length; i++)
        {
            var entry = entries[i];
            var items = gear_options.get(entry.key);
            items.push(entry);
        }
        
        // Scan comments for additonal in-bag gear
        var inbag = [];
        var match;
        while ((match = BAG_REGEX.exec(input)) !== null) {
            var entry = new Entry('');
            entry.raw  = match[0];
            entry.name = match[1];
            entry.key  = match[2];
            entry.val  = match[3];

            gear_options.get(entry.key).push(entry);
        }
        
        function entry_sorter(a, b){
            return a.name > b.name;
        }
        
        // Condense Rings and Trinkets
        var rings = []
        for (let entry of gear_options.get("finger1")){ rings.push(entry); }
        for (let entry of gear_options.get("finger2")){ rings.push(entry); }
        rings.sort(entry_sorter);
        var trinkets = []
        for (let entry of gear_options.get("trinket1")){ trinkets.push(entry); }
        for (let entry of gear_options.get("trinket2")){ trinkets.push(entry); }
        trinkets.sort(entry_sorter);
        
        gear_options.set("rings", rings);
        gear_options.delete("finger1");
        gear_options.delete("finger2");
        gear_options.set("trinkets", trinkets);
        gear_options.delete("trinket1");
        gear_options.delete("trinket2");
        
        
        // Show gear_options
        var row_template = Handlebars.compile( $("#tmpRow").html() );
        
        var options = $("div#options");
        var table = options.find('.table').last();       
        n_check = 0;
        for (let [key, entries] of gear_options){
            table.append('<div class="row head"><div class="hr">' + key + '</div></div>')
            for (let entry of entries){
                var data = {
                    class: key,
                    id:    "check" + n_check,
                    name:  entry.name,
                    value: entry.val,
                    label: entry.name,
                    check: ''
                };
                if(entry.name.startsWith("(Equipped")){ data.check = ' checked disabled'; }
                n_check += 1;
                table.append(row_template(data));
            }
        }
    
        // Prepare for Tab 2
        $("input[type=checkbox]").on('change', function(){
            var cc = $("input[type=checkbox]:checked")
            var n = 1;
            for (let key of GEAR_SLOTS){
                var t = cc.filter("."+key).length
                if (key == "rings" || key == "trinkets"){ 
                    t = binomial(t, 2);
                }
                n = n * t;
            }
            $("span#status").html(n);
        });

        // "Save" entries
        entries_config  = config;
        entries_options = entries;
    
        // Open options accordion tab
        $('#accordion').accordion("option", "active", 1);
    });
    
    /*== GENERATE ================================================================================*/
    $("input[name='generate']").click(function(){
        var taOut = $("textarea[name='output']")
        
        function output(s)
        {
            taOut.val(taOut.val() + s + "\n");
        }
        
        var checked_boxes = $("input[type=checkbox]:checked");
        
        // Clear output textarea
        taOut.val("");
        
        /*
        // Write config lines -- level, talents, spec, etc.
        for (let entry of entries_config){
            output(entry.raw);
        }
        
        // Write equipped lines
        output("\n### Currently Equipped:");
        checked_boxes.filter(":disabled").each(function(index){
            var element = $(this);
            output(element.val());
        });
        */
        
        // Copy base sim profile from add-on output
        for(let line of $("textarea#input").val().split('\n'))
        {
            if (line.startsWith('#')){ continue; }
            output(line.trimRight());
        }
        
        
        // Initialize gear_options map, keyed by GEAR_SLOTS[i], with array values
        var gear_options = new Map();
        for (let slot of GEAR_SLOTS){
            gear_options.set(slot, []);
        }
        
        // Gather slot options from checked checkboxes
        checked_boxes.each(function(index){
            var element = $(this);
            var slot_options = gear_options.get(element.attr('class'));
            var option_name = neuter(element.attr('name'));
            var option_str  = element.val();
            slot_options.push(option_name + option_str);
        });
        
        
        var product_args = [];
        for (let slot of GEAR_SLOTS){
            //if (slot == "rings" || slot == "trinkets"){ continue; }
            
            var slot_options = []
            for (let option of gear_options.get(slot)){
                slot_options.push(slot + "=" + option)
            }
            product_args.push(slot_options);
        }
        
        // Handle Rings and Trinkets
        product_args[12] = allPairs(product_args[12]);  // Rings
        product_args[13] = allPairs(product_args[13]);  // Trinkets
        //debug(JSON.stringify(product_args, null, 2));
        
        var combination_index = 1;
        var sims = product.apply(this, product_args);
        for (let sim of sims)
        {
            // Adjust sim[12],sim[13] for finger1,fingers and sim[14],sim[15] for trinket1,trinket2
            sim[12] = sim[12].replace("rings=",    "finger1=");
            sim[13] = sim[13].replace("rings=",    "finger2=");
            sim[14] = sim[14].replace("trinkets=", "trinket1=");
            sim[15] = sim[15].replace("trinkets=", "trinket2=");
            
            
            var lines = sim;
            lines = lines.filter(function(line){ return !line.includes("=equipped,"); });
            lines = lines.filter(function(line){ return !line.includes("1=equipped__slot_1"); });
            lines = lines.filter(function(line){ return !line.includes("2=equipped__slot_2"); });
            
            if (lines.length == 0){ continue; }
            
            output('#== COMBINATION ' + combination_index + ' ==');
            if (lines.length == 1)
            {
                var line = lines[0];
                var copy_name = line.substring(line.indexOf('=')+1, line.indexOf(','));
                output('copy="' + copy_name + ' (' + combination_index + ')"');
            }
            else
            {
                output('copy="Combination (' + combination_index + ')"');
            }
            
            combination_index += 1;
            for (let line of lines){ output(line); }
            output('');
            
            
            debug(JSON.stringify(lines, null, 2));
        }
        

        
        // Open output accordion tab
        $('#accordion').accordion("option", "active", 2);
    });
    

});

