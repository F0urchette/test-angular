import { Component, OnInit } from '@angular/core';
import * as Chart from 'chart.js';
import * as ChartDataLabels from 'chartjs-plugin-datalabels';
import { DataService } from '../services/data.service';
import { Repository } from '../models/Repository.model';
import { CommitColor, Commit } from '../models/Commit.model';
import { CommitsService } from '../services/commits.service';
declare var $: any;

@Component({
  selector: 'app-students-commits-view',
  templateUrl: './students-commits-view.component.html',
  styleUrls: ['./students-commits-view.component.scss']
})
export class StudentsCommitsViewComponent implements OnInit {
  date: number;
  min: number;
  max: number;
  dict = [];
  tpGroup: string;
  chartLabels = [];
  chartOptions = {
    layout: {
      padding: {
        top: 10
      }
    },
    responsive: true,
    aspectRatio: 2.4,
    animation: {
      duration: 0 // general animation time
    },
    responsiveAnimationDuration: 0,
    legend: {
      position: 'bottom'
    },
    tooltips: {
      enabled: true,
      mode: 'index'
    },
    scales: {
      xAxes: [
        {
          stacked: true
        }
      ],
      yAxes: [
        {
          id: 'A',
          type: 'linear',
          stacked: true,
          position: 'left',
          scaleLabel: {
            display: true,
            labelString: '% of commits'
          },
          ticks: {
            max: 100
          }
        },
        {
          id: 'B',
          type: 'category',
          position: 'right',
          offset: true,
          scaleLabel: {
            display: true,
            labelString: 'Question progression'
          },
          gridLines: {
            display: false
          },
          labels: this.dataService.questions
            ? this.dataService.questions.slice().reverse()
            : []
        },
        {
          id: 'C',
          stacked: true,
          offset: true,
          type: 'linear',
          display: false
        }
      ]
    },
    annotation: {
      annotations: [
        {
          drawTime: 'afterDatasetsDraw',
          id: 'hline',
          type: 'line',
          mode: 'horizontal',
          scaleID: 'y-axis-0',
          value: 28.25,
          borderColor: 'black',
          borderWidth: 5,
          label: {
            backgroundColor: 'red',
            content: 'Test Label',
            enabled: true
          }
        }
      ]
    },
    plugins: {
      datalabels: {
        clip: false,
        color: 'white',
        font: {
          weight: 'bold'
        },
        backgroundColor: function(context) {
          return context.dataset.backgroundColor;
        },
        borderRadius: 4,
        display: false,
        formatter: function(value, context) {
          return context.dataset.data[context.dataIndex].y;
        }
      }
    }
  };

  chartData = [{ data: [] }];

  constructor(
    public dataService: DataService,
    private commitsService: CommitsService
  ) {}

  loadGraphDataAndRefresh() {
    if (this.dataService.repositories) {
      let colors = [
        CommitColor.INTERMEDIATE,
        CommitColor.BEFORE,
        CommitColor.BETWEEN,
        CommitColor.AFTER
      ];

      this.chartLabels = this.loadLabels();
      let dict = this.commitsService.loadStudentsDict(
        this.dataService.repositories,
        this.dataService.questions,
        colors,
        this.tpGroup,
        this.date
      );
      this.chartData = this.commitsService.loadStudents(dict, colors);
    }
  }
  loadLabels(): any[] {
    return this.dataService.repositories
      .filter(
        repository => !this.tpGroup || repository.tpGroup === this.tpGroup
      )
      .map(repository => repository.name);
  }

  ngOnInit() {
    $('#dateSlider').tooltip();
    Chart.pluginService.register(ChartDataLabels);
    this.dataService.lastUpdateDate &&
      ((this.date = this.dataService.lastUpdateDate.getTime()) &&
        (this.max = this.date) &&
        (this.min = this.getMinDateTimestamp()));
    this.loadGraphDataAndRefresh();
  }

  ngOnDestroy() {
    Chart.pluginService.unregister(ChartDataLabels);
  }

  getMinDateTimestamp() {
    let commits = [];
    this.dataService.repositories.forEach(repository => {
      commits = commits.concat(repository.commits);
    });
    let min = commits.reduce(
      (min, commit) =>
        commit.commitDate.getTime() < min.getTime() ? commit.commitDate : min,
      commits[0].commitDate
    );
    return min.getTime();
  }
}
