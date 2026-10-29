Module.register("MMM-BadgerFootball", {
  // Default module configuration
  defaults: {
    teamId: "275", // ESPN Team ID for Wisconsin Badgers
    updateInterval: 60 * 60 * 1000, // Refresh every 1 hour
    maxGames: 8, // Number of games to display
    showPastGames: true, // Show completed games with final scores
  },

  getStyles: function () {
    return ["MMM-BadgerFootball.css"];
  },

  start: function () {
    this.games = [];
    this.loaded = false;
    this.getSchedule();
    var self = this;
    setInterval(function () {
      self.getSchedule();
    }, this.config.updateInterval);
  },

  getSchedule: function () {
    var self = this;
    var url = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/" + this.config.teamId + "/schedule";

    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {
          self.processSchedule(JSON.parse(this.responseText));
        } else {
          console.error("MMM-BadgerFootball: Could not load schedule.");
        }
      }
    };
    request.send();
  },

  processSchedule: function (data) {
    if (!data || !data.events) return;

    var events = data.events;
    var parsedGames = [];

    events.forEach((event) => {
      var competition = event.competitions[0];
      var badgers = competition.competitors.find((c) => c.id === this.config.teamId);
      var opponent = competition.competitors.find((c) => c.id !== this.config.teamId);

      var isHome = badgers.homeAway === "home";
      var gameDate = new Date(event.date);

      var statusState = competition.status.type.state; // "pre", "in", or "post"
      var scoreString = "";

      if (statusState === "post") {
        scoreString = badgers.score + " - " + opponent.score;
        var won = badgers.winner;
        scoreString += won ? " (W)" : " (L)";
      } else if (statusState === "in") {
        scoreString = badgers.score + " - " + opponent.score + " Live";
      } else {
        // Scheduled game time
        scoreString = gameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      parsedGames.push({
        date: gameDate.toLocaleDateString([], { month: "short", day: "numeric" }),
        opponent: (isHome ? "vs " : "@ ") + opponent.team.shortDisplayName,
        scoreOrTime: scoreString,
        completed: statusState === "post",
        isHome: isHome,
      });
    });

    if (!this.config.showPastGames) {
      parsedGames = parsedGames.filter((g) => !g.completed);
    }

    this.games = parsedGames.slice(0, this.config.maxGames);
    this.loaded = true;
    this.updateDom();
  },

  getDom: function () {
    var wrapper = document.createElement("div");
    wrapper.className = "badger-schedule-wrapper";

    if (!this.loaded) {
      wrapper.innerHTML = "On Wisconsin! Loading schedule...";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    var table = document.createElement("table");
    table.className = "small badger-table";

    this.games.forEach((game) => {
      var row = document.createElement("tr");

      var dateCell = document.createElement("td");
      dateCell.className = "badger-date dimmed";
      dateCell.innerHTML = game.date;
      row.appendChild(dateCell);

      var oppCell = document.createElement("td");
      oppCell.className = "badger-opp align-left";
      oppCell.innerHTML = game.opponent;
      row.appendChild(oppCell);

      var statusCell = document.createElement("td");
      statusCell.className = "badger-status align-right bright";
      statusCell.innerHTML = game.scoreOrTime;
      row.appendChild(statusCell);

      table.appendChild(row);
    });

    wrapper.appendChild(table);
    return wrapper;
  }
});
