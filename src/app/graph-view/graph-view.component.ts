import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { AuthService } from '../services/auth.service';
import { CommitsService } from '../services/commits.service';
import { Commit } from '../models/Commit.model';


@Component({
  selector: 'app-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrls: ['./graph-view.component.scss']
})
export class GraphViewComponent implements OnInit {

  constructor(private authService: AuthService, private commitsService: CommitsService) { }

  @ViewChild(BaseChartDirective) myChart: BaseChartDirective;

  loading = false;
  commits: Commit[][] = [];
  commit = null;
  monImage = new Image();
  public repositories: string[];
  public filename;

  chartOptions = {
    responsive: true,
    aspectRatio: 2.4,
    animation: {
      duration: 0 // general animation time
    },
    responsiveAnimationDuration: 0,
    hover: {
      mode: 'nearest',
      intersec: true,
      animationDuration: 0
    },
    interaction: {
      mode: 'nearest',
    },
    tooltips: {
      callbacks: {
        label(tooltipItem, data) {
          return '';
        },
        beforeBody(tooltipItem, data) {
          const commit = data.datasets[tooltipItem[0].datasetIndex].data[tooltipItem[0].index].commit;
          return commit.message + '\n\n' + commit.author;
        }
      },
      displayColors: false
    },
    elements: {
      line: {
        fill: false,
        borderWidth: 1
      },
      point: {
        hitRadius: 8,
        radius: 5,
        pointStyle: 'circle'
      }
    },
    // showLines: false,
    scales: {
      xAxes: [{
        type: 'time',
        offset: true,
        time: {
          unit: 'day',
          tooltipFormat: 'DD/MM/YY HH:mm',
          displayFormats: {
            day: 'DD/MM/YY',
            week: 'MMM DD',
          }
        }
      }],
      yAxes: [{
        type: 'category',
        labels: [],
        offset: true,
      }]
    },
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          onPan({chart}) { }
        },
        zoom: {
          enabled: true,
          // drag: true,
          // drag: {
          //   borderColor: 'rgba(225,225,225,0.3)',
          //   borderWidth: 5,
          //   backgroundColor: 'rgb(225,225,225)'
          // },

          mode: 'x',

          // Speed of zoom via mouse wheel
          // (percentage of zoom on a wheel event)
          speed: 0.3,
          onZoom: ({chart}) => { }
        }
      }
    }
  };

  chartData = [
    {data: []}
  ];

  onChartClick(event) {
    console.log(event);
    if (event.active.length > 0) {
      const dataObject = this.getDataFromChart(event);
      console.log(dataObject);
// tslint:disable-next-line: no-string-literal
      window.open(dataObject['myobject'], '_blank');
    }
  }

  getDataFromChart(event) {
    const datasetIndex = event.active[0]._datasetIndex;
    const dataIndex = event.active[0]._index;
    return this.chartData[datasetIndex].data[dataIndex];
  }

  onChartHover(event) { }

  ngOnInit(): void {
    // this.loadGraph();
  }

  loadGraph(date?: Date) {
    this.loading = true;
    this.monImage.src = 'https://image.flaticon.com/icons/png/512/25/25694.png';
    this.monImage.height = 15;
    this.monImage.width = 15;

    console.log(this.repositories);
    console.log('date loadGRaph', date);
    this.commitsService.getRepositoriesCommits(this.repositories, date).subscribe(response => {
      const chartData = [];
      const labels = [];
      for (let i = 0; i < response.length; i++) {
        this.commits.push(response[i].slice());
        const data = [];
        labels.push('repo ' + i);
        this.commits[i].forEach(commit => {
          data.push({x: commit.commitDate, y: 'repo ' + i, commit});
        });
        chartData.push({data});
      }
      this.chartData = chartData;
      this.chartOptions.scales.yAxes[0].labels = labels;

      this.myChart.chart.destroy();
      this.myChart.datasets = this.chartData;
      this.myChart.ngOnInit();
      this.loading = false;
    });
  }

  changeListener($event): void {
    this.readFile($event.target);
  }

  readFile(inputValue: any): void {
      const file: File = inputValue.files[0];
      const myReader: FileReader = new FileReader();
      const fileType = inputValue.parentElement.id;
      myReader.onloadend = (e) => {
        this.filename = file.name;
        const text = this.getJSONOrNull(myReader.result);
        if (text) {
          this.repositories = text.repositories.slice();
          if (text.date) {
            this.loadGraph(new Date(text.date));
          } else {
            this.loadGraph();
          }
        }
        // TODO: Erreur
     };

      myReader.readAsText(file);
  }

  getJSONOrNull(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }
}
