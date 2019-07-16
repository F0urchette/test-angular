import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse
} from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Commit } from '../models/Commit.model';
import { forkJoin } from 'rxjs';
import { Repository } from '../models/Repository.model';
import moment from 'moment/src/moment';
import { CommitColor } from '../models/Commit.model';

@Injectable({
  providedIn: 'root'
})
export class CommitsService {
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: 'token ' + this.authService.token
    })
  };

  constructor(private http: HttpClient, private authService: AuthService) {}

  getRepositories(repoTab, startDate?: String, dateFin?: String) {
    const tab = [];
    repoTab.forEach(repo => {
      tab.push(this.getRepository(repo, startDate, dateFin));
    });
    return forkJoin(tab);
  }

  getRepositoryFromRaw(repo, response) {
    let tab;

    if (response[1] instanceof HttpErrorResponse) {
      throw 'Repository not found or you have no rights on it : ' + repo.url;
    }

    if (!repo.name || !repo.tpGroup) {
      if (response[0] instanceof HttpErrorResponse)
        throw 'ReadMe not found for repo : ' + repo.url;

      const readme = decodeURIComponent(
        escape(window.atob(response[0].content))
      );
      tab = readme
        .split(/(### NOM :)|(### Prénom :)|(### Groupe de TP :)|\n/g)
        .filter(values => Boolean(values) === true);
    }

    if (!repo.name) {
      if (!tab[4] || !tab[2]) {
        const repoName = repo.url.split('/');
        repo.name = repoName[4];
      } else {
        repo.name = tab[4].trim() + ' ' + tab[2].trim();
      }
    }
    if (!repo.tpGroup && tab[6]) {
      repo.tpGroup = tab[6].trim();
    }

    repo.commits = response[1];
    return repo;
  }

  getRepository(repo: Repository, startDate?: String, dateFin?: String) {
    return forkJoin(
      this.getReadMe(repo).pipe(catchError(error => of(error))),
      this.getCommits(repo, startDate, dateFin).pipe(
        catchError(error => of(error))
      )
    );
  }

  getCommits(repo: Repository, startDate?, dateFin?): Observable<Commit[]> {
    const repoHashURL = repo.url.split('/');
    let url =
      'https://api.github.com/repos/' +
      repoHashURL[3] +
      '/' +
      repoHashURL[4] +
      '/commits?per_page=100';
    if (startDate) {
      startDate = moment(startDate).toDate();
      url = url.concat('&since=' + startDate.toISOString());
    }
    if (dateFin) {
      dateFin = moment(dateFin).toDate();
      url = url.concat('&until=' + dateFin.toISOString());
    }
    return this.http.get<Commit[]>(url, this.httpOptions).pipe(
      map(response => {
        //
        const array = response.map(data => Commit.withJSON(data));
        //
        return array;
      })
    );
  }

  getReadMe(repo: Repository): Observable<any> {
    const tabHashURL = repo.url.split('/');
    const url =
      'https://api.github.com/repos/' +
      tabHashURL[3] +
      '/' +
      tabHashURL[4] +
      '/readme';
    return this.http.get(url, this.httpOptions);
  }

  initQuestionsDict(questions: string[], colors) {
    let dict = {};
    questions.forEach(question => {
      dict[question] = {};
      colors.forEach(color => {
        dict[question][color.label] = {
          count: 0,
          percentage: 0,
          students: []
        };
      });
    });

    return dict;
  }

  loadQuestionsDict(
    dict,
    repositories,
    questions: string[],
    colors,
    tpGroup?,
    date?
  ) {
    let repos = repositories.filter(
      repository => !tpGroup || repository.tpGroup === tpGroup
    );
    repos.forEach(repository => {
      let studentQuestions = [];
      repository.commits
        .filter(commit => !date || commit.commitDate.getTime() < date)
        .forEach(commit => {
          if (commit.question) {
            let students = [];
            for (let commitColor in dict[commit.question]) {
              students = students.concat(
                dict[commit.question][commitColor].students
              );
            }
            if (
              !students.includes(repository.name) &&
              colors.includes(commit.color)
            ) {
              dict[commit.question][commit.color.label].count++;
              dict[commit.question][commit.color.label].students.push(
                repository.name
              );
              studentQuestions.push(commit.question);
            }
          }
        });
      questions.forEach(question => {
        if (!studentQuestions.includes(question)) {
          dict[question][CommitColor.NOCOMMIT.label].count++;
          dict[question][CommitColor.NOCOMMIT.label].students.push(
            repository.name
          );
        }
      });
    });
    for (let question in dict) {
      for (let commitColor in dict[question]) {
        dict[question][commitColor].percentage =
          (dict[question][commitColor].count / repos.length) * 100;
      }
    }
    return dict;
  }

  loadQuestions(dict, colors, questions: string[]) {
    let data = [];
    colors.forEach(color => {
      data.push({
        label: color.label,
        backgroundColor: color.color,
        hoverBackgroundColor: color.color,
        borderColor: 'grey',
        data: questions.map(question => {
          return {
            y: dict[question][color.label].percentage,
            data: dict[question][color.label]
          };
        })
      });
    });

    return data;
  }

  initStudentsDict(repository: Repository, dict, questions: string[], colors) {
    dict.push({
      commitTypes: {},
      lastQuestionDone: questions[0],
      count: 0
    });
    colors.forEach(color => {
      dict[dict.length - 1]['commitTypes'][color.label] = {
        count: 0
      };
    });
  }

  loadStudentsDict(
    repositories: Repository[],
    questions: string[],
    colors,
    tpGroup?: string,
    date?: number
  ) {
    let dict = [];
    let repos = repositories.filter(
      repository => !tpGroup || repository.tpGroup === tpGroup
    );
    repos.forEach((repository, index) => {
      this.initStudentsDict(repository, dict, questions, colors);
      repository.commits
        .filter(commit => !date || commit.commitDate.getTime() < date)
        .forEach(commit => {
          dict[index]['commitTypes'][commit.color.label].count++;
          dict[index].count++;
          this.isSupThan(
            commit.question,
            dict[index].lastQuestionDone,
            questions
          ) && (dict[index].lastQuestionDone = commit.question);
        });
      dict[index].name = repository.name;
      dict[index].url = repository.url;
      dict[index].tpGroup = repository.tpGroup;
      dict[index].commits = repository.commits;
      colors.forEach(color => {
        dict[index]['commitTypes'][color.label].percentage =
          (dict[index]['commitTypes'][color.label].count / dict[index].count) *
          100;
      });
    });

    return dict;
  }

  loadStudents(dict, colors) {
    let data = [];

    data.push({
      label: '# of commits',
      yAxisID: 'C',
      type: 'line',
      fill: false,
      borderWidth: 2,
      datalabels: {
        display: true
      },
      borderColor: 'lightblue',
      hoverBackgroundColor: 'lightblue',
      backgroundColor: 'lightblue',
      data: dict.map(student => {
        return {
          y: student.count,
          data: student
        };
      })
    });

    data.push({
      label: 'Question progression',
      borderColor: 'blue',
      type: 'line',
      fill: false,
      datalabels: {
        display: true
      },
      yAxisID: 'B',
      data: dict.map(student => {
        return {
          y: student.lastQuestionDone,
          data: student
        };
      })
    });

    colors.forEach(color => {
      data.push({
        label: color.label,
        backgroundColor: color.color,
        hoverBackgroundColor: color.color,
        borderColor: 'grey',
        yAxisID: 'A',
        data: dict.map(student => {
          return {
            y: student['commitTypes'][color.label].percentage,
            data: student
          };
        })
      });
    });

    return data;
  }

  compareQuestions(q1, q2, questions) {
    return questions.indexOf(q1) - questions.indexOf(q2);
  }

  isSupThan(q1, q2, questions) {
    return (
      questions.includes(q2) && this.compareQuestions(q1, q2, questions) > 0
    );
  }
}
