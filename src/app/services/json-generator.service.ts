import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Repository } from '../models/Repository.model';
import { Seance } from '../models/Seance.model';
import { Jalon } from '../models/Jalon.model';

@Injectable({
  providedIn: 'root'
})
export class JsonGeneratorService {
  constructor(private sanitizer: DomSanitizer) {}

  generateDownloadJsonUrl(
    repositories: Repository[],
    seances?: Seance[],
    corrections?: Jalon[],
    reviews?: Jalon[],
    dateDebut?: string,
    dateFin?: string
  ) {
    const blob = new Blob(
      [
        JSON.stringify(
          this.generateJson(
            repositories,
            seances,
            corrections,
            reviews,
            dateDebut,
            dateFin
          )
        )
      ],
      {
        type: 'application/octet-stream'
      }
    );

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      window.URL.createObjectURL(blob)
    );
  }

  generateJson(
    repositories: Repository[],
    seances?: Seance[],
    corrections?: Jalon[],
    reviews?: Jalon[],
    dateDebut?: string,
    dateFin?: string
  ) {
    let json = {};
    let repos = [];
    repositories.forEach(repository => {
      let repo = {};
      repo['url'] = repository.url;
      if (repository.name) {
        repo['name'] = repository.name;
      }
      if (repository.groupeTP) {
        repo['groupeTP'] = repository.groupeTP;
      }
      repos.push(repo);
    });
    json['repositories'] = repos;

    if (seances) {
      json['seances'] = seances.map(seance => seance.json());
    }
    if (corrections) {
      json['corrections'] = corrections.map(correction => correction.json());
    }
    if (reviews) {
      json['reviews'] = reviews.map(review => review.json());
    }
    if (dateDebut) {
      json['dateDebut'] = dateDebut;
    }
    if (dateFin) {
      json['dateFin'] = dateFin;
    }

    return json;
  }
}
